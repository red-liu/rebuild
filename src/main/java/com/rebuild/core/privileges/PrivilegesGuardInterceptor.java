/*
Copyright (c) REBUILD <https://getrebuild.com/> and/or its owners. All rights reserved.

rebuild is dual-licensed under commercial and open source licenses (GPLv3).
See LICENSE and COMMERCIAL in the project root for license information.
*/

package com.rebuild.core.privileges;

import cn.devezhao.bizz.privileges.Permission;
import cn.devezhao.bizz.privileges.PrivilegesException;
import cn.devezhao.bizz.privileges.impl.BizzPermission;
import cn.devezhao.bizz.security.AccessDeniedException;
import cn.devezhao.persist4j.Entity;
import cn.devezhao.persist4j.Field;
import cn.devezhao.persist4j.Record;
import cn.devezhao.persist4j.engine.ID;
import com.rebuild.core.Application;
import com.rebuild.core.UserContextHolder;
import com.rebuild.core.metadata.MetadataHelper;
import com.rebuild.core.metadata.easymeta.EasyMetaFactory;
import com.rebuild.core.service.CommonsService;
import com.rebuild.core.service.general.BulkContext;
import com.rebuild.core.service.general.EntityService;
import com.rebuild.core.support.i18n.Language;
import lombok.extern.slf4j.Slf4j;
import org.aopalliance.intercept.MethodInterceptor;
import org.aopalliance.intercept.MethodInvocation;
import org.springframework.util.Assert;

import java.lang.reflect.Method;
import java.security.Guard;

/**
 * 权限验证 - 拦截所有 *Service 方法
 *
 * @author devezhao
 * @since 10/12/2018
 */
@Slf4j
public class PrivilegesGuardInterceptor implements MethodInterceptor, Guard {

    @Override
    public Object invoke(MethodInvocation invocation) throws Throwable {
        checkGuard(invocation);
        return invocation.proceed();
    }

    @Override
    public void checkGuard(Object object) throws SecurityException {
        final MethodInvocation invocation = (MethodInvocation) object;
        if (!isGuardMethod(invocation)) {
            return;
        }

        final ID caller = UserContextHolder.getUser();
        if (Application.devMode()) {
            log.info("User [ " + caller + " ] call : " + invocation.getMethod());
        }

        Class<?> invocationClass = invocation.getThis().getClass();
        // 验证管理员操作
        if (AdminGuard.class.isAssignableFrom(invocationClass) && !UserHelper.isAdmin(caller)) {
            throw new AccessDeniedException(Language.L("Error403"));
        }
        // 仅 EntityService 或子类会验证角色权限
        if (!EntityService.class.isAssignableFrom(invocationClass)) {
            return;
        }

        boolean isBulk = invocation.getMethod().getName().startsWith("bulk");
        if (isBulk) {
            Object firstArgument = invocation.getArguments()[0];
            if (!BulkContext.class.isAssignableFrom(firstArgument.getClass())) {
                throw new IllegalArgumentException("First argument must be BulkContext!");
            }

            BulkContext context = (BulkContext) firstArgument;
            Entity entity = context.getMainEntity();
            if (!Application.getPrivilegesManager().allow(caller, entity.getEntityCode(), context.getAction())) {
                log.error("User [ " + caller + " ] not allowed execute action [ " + context.getAction() + " ]. Entity : " + context.getMainEntity());
                throw new AccessDeniedException(formatHumanMessage(context.getAction(), entity, null));
            }
            return;
        }

        Object idOrRecord = invocation.getArguments()[0];

        ID recordId;
        Entity entity;

        if (Record.class.isAssignableFrom(idOrRecord.getClass())) {
            recordId = ((Record) idOrRecord).getPrimary();
            entity = ((Record) idOrRecord).getEntity();
        } else if (ID.class.isAssignableFrom(idOrRecord.getClass())) {
            recordId = (ID) idOrRecord;
            entity = MetadataHelper.getEntity(recordId.getEntityCode());
        } else {
            throw new IllegalArgumentException("First argument must be Record or ID : " + idOrRecord);
        }

        // 忽略权限检查
        if (EasyMetaFactory.valueOf(entity).isPlainEntity()) return;

        Permission action = getPermissionByMethod(invocation.getMethod(), recordId == null);

        boolean allowed;
        if (action == BizzPermission.CREATE) {
            // 明细实体
            if (entity.getMainEntity() != null) {
                Assert.isTrue(Record.class.isAssignableFrom(idOrRecord.getClass()), "First argument must be Record!");

                Field dtmField = MetadataHelper.getDetailToMainField(entity);
                ID mainid = ((Record) idOrRecord).getID(dtmField.getName());
                if (mainid == null || !Application.getPrivilegesManager().allowUpdate(caller, mainid)) {
                    throw new AccessDeniedException(Language.L("YouNoSomePermission", "AddDetail"));
                }
                allowed = true;

            } else {
                allowed = Application.getPrivilegesManager().allow(caller, entity.getEntityCode(), action);
            }

        } else {
            Assert.notNull(recordId, "No primary in record!");
            allowed = Application.getPrivilegesManager().allow(caller, recordId, action);
        }

        // 无权限操作
        if (!allowed && PrivilegesGuardContextHolder.getSkipGuardOnce() != null) {
            allowed = true;
            log.warn("Allow no permission(" + action.getName() + ") passed once : " + recordId);
        }

        if (!allowed) {
            log.error("User [ " + caller + " ] not allowed execute action [ " + action + " ]. "
                    + (recordId == null ? "Entity : " + entity : "Record : " + recordId));
            throw new AccessDeniedException(formatHumanMessage(action, entity, recordId));
        }
    }

    /**
     * @param invocation
     * @return
     */
    private boolean isGuardMethod(MethodInvocation invocation) {
        if (CommonsService.class.isAssignableFrom(invocation.getThis().getClass())) {
            return false;
        }

        String action = invocation.getMethod().getName();
        return action.startsWith("create")
                || action.startsWith("delete")
                || action.startsWith("update")
                || action.startsWith("assign")
                || action.startsWith("share")
                || action.startsWith("unshare")
                || action.startsWith("bulk");
    }

    /**
     * @param method
     * @param isNew
     * @return
     */
    private Permission getPermissionByMethod(Method method, boolean isNew) {
        String action = method.getName();
        if (action.startsWith("createOrUpdate")) {
            return isNew ? BizzPermission.CREATE : BizzPermission.UPDATE;
        } else if (action.startsWith("create")) {
            return BizzPermission.CREATE;
        } else if (action.startsWith("delete")) {
            return BizzPermission.DELETE;
        } else if (action.startsWith("update")) {
            return BizzPermission.UPDATE;
        }  else if (action.startsWith("assign")) {
            return BizzPermission.ASSIGN;
        } else if (action.startsWith("share")) {
            return BizzPermission.SHARE;
        } else if (action.startsWith("unshare")) {
            return EntityService.UNSHARE;
        }
        throw new PrivilegesException("No matchs Permission found : " + action);
    }

    /**
     * @param action
     * @param entity
     * @param target
     * @return
     */
    private String formatHumanMessage(Permission action, Entity entity, ID target) {
        String actionKey = null;
        if (action == BizzPermission.CREATE) {
            actionKey = "Create";
        } else if (action == BizzPermission.DELETE) {
            actionKey = "Delete";
        } else if (action == BizzPermission.UPDATE) {
            actionKey = "Update";
        } else if (action == BizzPermission.ASSIGN) {
            actionKey = "Assign";
        } else if (action == BizzPermission.SHARE) {
            actionKey = "Share";
        } else if (action == EntityService.UNSHARE) {
            actionKey = "UnShare";
        }

        if (target == null) {
            return Language.L("YouNoSomePermission", actionKey) + " (" + EasyMetaFactory.getLabel(entity) + ")";
        } else {
            return Language.L("YouNoSomeRecordPermission", actionKey) + " (" + target + ")";
        }
    }
}
