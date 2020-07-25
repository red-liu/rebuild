/*
Copyright (c) REBUILD <https://getrebuild.com/> and its owners. All rights reserved.

rebuild is dual-licensed under commercial and open source licenses (GPLv3).
See LICENSE and COMMERCIAL in the project root for license information.
*/
/* global autosize, EMOJIS */

const wpc = window.__PageConfig

const __TaskViewer = parent && parent.TaskViewModal ? parent.TaskViewModal.__HOLDER
  : { hide: () => window.close(), setLoadingState: () => { } }

let __TaskContent
let __TaskComment

$(document).ready(() => {
  renderRbcomp(<TaskContent id={wpc.taskId} />, 'task-contents',
    function () { __TaskContent = this })
  renderRbcomp(<TaskComment id={wpc.taskId} call={() => __TaskContent.refreshComments()} />, 'task-comment',
    function () { __TaskComment = this })

  $('.J_close').click(() => __TaskViewer.hide())
  $('.J_reload').click(() => {
    __TaskViewer.setLoadingState(true)
    location.reload()
  })
})

const __PRIORITIES = { 0: '较低', 1: '普通', 2: '紧急', 3: '非常紧急' }

// 任务详情
class TaskContent extends React.Component {
  state = { ...this.props, priority: 1 }

  render() {
    const plansOfState = this.state.plansOfState || []
    return (
      <div className="rbview-form task-form">
        <div className="form-group row pt-0">
          <div className="col-10">
            <input type="text" className="task-title" name="taskName" defaultValue={this.state.taskName} ref={(c) => this._taskName = c}
              onBlur={(e) => this._handleChangeTaskName(e)}
              onKeyDown={(e) => this._enterKey(e)} />
          </div>
          <div className="col-2 text-right">
            <button className="btn btn-secondary" style={{ minWidth: 80, marginTop: 2 }} data-toggle="dropdown">操作 <i className="icon zmdi zmdi-more-vert"></i></button>
            <div className="dropdown-menu dropdown-menu-right">
              <a className="dropdown-item text-muted" onClick={() => this._handleDelete()}>删除</a>
            </div>
          </div>
        </div>
        <div className="form-group row">
          <label className="col-12 col-sm-3 col-form-label"><i className="icon zmdi zmdi-square-o" /> 状态</label>
          <div className="col-12 col-sm-9">
            <div className="form-control-plaintext">
              <div className="float-left status-checkbox">
                <label className="custom-control custom-checkbox custom-control-inline" title="已完成/未完成" onClick={(e) => $stopEvent(e)}>
                  <input className="custom-control-input" type="checkbox" ref={(c) => this._status = c}
                    disabled={this.state.currentPlanStatus === 2}
                    onChange={(e) => this._handleChangeStatus(e)} />
                  <span className="custom-control-label"></span>
                </label>
              </div>
              <div className="float-left">
                <a className="tag-value arrow plaintext" data-toggle="dropdown">
                  {this.state.currentPlanId ? (plansOfState.find(x => x.id === this.state.currentPlanId) || { text: '[DELETED]' }).text : ''}
                </a>
                <div className="dropdown-menu">
                  {plansOfState.map((item) => {
                    const disabled = !this.state.currentPlanNexts.includes(item.id)
                    return <a key={`plan-${item.id}`} className="dropdown-item" disabled={disabled} data-disabled={disabled} onClick={(e) => this._handleChangePlan(item.id, e)}>{item.text}</a>
                  })}
                </div>
              </div>
              <div className="clearfix" />
            </div>
          </div>
        </div>
        <div className="form-group row">
          <label className="col-12 col-sm-3 col-form-label"><i className="icon zmdi zmdi-account-o" /> 执行人</label>
          <div className="col-12 col-sm-9">
            <React.Fragment>
              {this.state.executor ?
                (
                  <div className="executor-show">
                    <UserShow id={this.state.executor[0]} name={this.state.executor[1]} showName={true} onClick={() => this._UserSelector.openDropdown()} />
                    <a className="close close-circle" onClick={() => this._handleChangeExecutor(null)} title="移除执行人">&times;</a>
                  </div>
                )
                : <div className="form-control-plaintext"><a className="tag-value arrow placeholder" onClick={() => this._UserSelector.openDropdown()}>选择执行人</a></div>
              }
            </React.Fragment>
            <div className="mount">
              <UserSelector hideDepartment={true} hideRole={true} hideTeam={true} hideSelection={true} multiple={false} closeOnSelect={true}
                onSelectItem={(s) => this._handleChangeExecutor(s)}
                ref={(c) => this._UserSelector = c} />
            </div>
          </div>
        </div>
        <div className="form-group row">
          <label className="col-12 col-sm-3 col-form-label"><i className="icon zmdi zmdi-time" /> 截至时间</label>
          <div className="col-12 col-sm-9">
            <div className="form-control-plaintext" ref={(c) => this._dates = c}>
              <a className={`tag-value arrow ${this.state.deadline ? 'plaintext' : 'placeholder'}`} name="deadline" title={this.state.deadline}>
                {this.state.deadline ? `${this.state.deadline.substr(0, 16)} (${$fromNow(this.state.deadline)})` : '选择截至时间'}
              </a>
            </div>
          </div>
        </div>
        <div className="form-group row">
          <label className="col-12 col-sm-3 col-form-label"><i className="icon zmdi zmdi-comment-more" /> 备注</label>
          <div className="col-12 col-sm-9">
            <TaskDescription content={this.state.description} $$$parent={this} />
          </div>
        </div>
        <div className="form-group row">
          <label className="col-12 col-sm-3 col-form-label"><i className="icon zmdi zmdi-circle-o" /> 优先级</label>
          <div className="col-12 col-sm-9">
            <div className="form-control-plaintext">
              <a className={`tag-value arrow priority-${this.state.priority}`} data-toggle="dropdown">{__PRIORITIES[this.state.priority]}</a>
              <div className="dropdown-menu">
                <a className="dropdown-item text-muted" onClick={() => this._handleChangePriority(0)}>较低</a>
                <a className="dropdown-item text-primary" onClick={() => this._handleChangePriority(1)}>普通</a>
                <a className="dropdown-item text-warning" onClick={() => this._handleChangePriority(2)}>紧急</a>
                <a className="dropdown-item text-danger" onClick={() => this._handleChangePriority(3)}>非常紧急</a>
              </div>
            </div>
          </div>
        </div>
        <div className="form-group row hide">
          <label className="col-12 col-sm-3 col-form-label"><i className="icon zmdi zmdi-label" /> 标签</label>
          <div className="col-12 col-sm-9">
            <div className="form-control-plaintext tags">
              {(this.state.tags || []).map((item) => {
                return <span className="tag-value" key={`tag-${item.id}`} data-id={item.id}>{item.text}</span>
              })}
              <a className="tag-value">+ 添加标签</a>
            </div>
          </div>
        </div>
        <div className="form-group row">
          <label className="col-12 col-sm-3 col-form-label"><i className="icon zmdi zmdi-attachment-alt pl-1" /> 附件</label>
          <div className="col-12 col-sm-9">
            <div className="form-control-plaintext">
              <input type="file" className="inputfile" id="attachments" ref={(c) => this._attachments = c} data-maxsize="102400000" />
              <label htmlFor="attachments" style={{ padding: 0, border: 0, lineHeight: 1 }}><a className="tag-value">+ 上传</a></label>
            </div>
            <div className="file-field attachments">
              {(this.state.attachments || []).map((item) => {
                const fileName = $fileCutName(item)
                return (
                  <a key={`file-${item}`} className="img-thumbnail" title={fileName} onClick={() => (parent || window).RbPreview.create([item])}>
                    <i className="file-icon" data-type={$fileExtName(fileName)} /><span>{fileName}</span>
                    <b title="删除" onClick={(e) => this._deleteAttachment(item, e)}><span className="zmdi zmdi-delete"></span></b>
                  </a>
                )
              })}
            </div>
          </div>
        </div>
        <TaskCommentsList taskid={this.props.id} ref={c => this._TaskCommentsList = c} />
      </div>
    )
  }

  componentDidMount() {
    __TaskViewer.setLoadingState(false)
    this.fetch()

    $(this._dates).find('.tag-value').datetimepicker({
      startDate: new Date(),
      clearBtn: true,
    }).on('changeDate', (e) => {
      this.handleChange({ target: { name: e.currentTarget.name, value: e.date ? moment(e.date).format('YYYY-MM-DD HH:mm:ss') : null } })
    })

    autosize(this._description)

    let mp = false
    $createUploader(this._attachments,
      () => {
        if (!mp) {
          $mp.start()
          mp = true
        }
      },
      (res) => {
        $mp.end()
        const s = (this.state.attachments || []).slice(0)
        s.push(res.key)
        this.handleChange({ target: { name: 'attachments', value: s } })
      })
  }

  fetch() {
    $.get(`/project/tasks/details?task=${this.props.id}`, (res) => {
      if (res.error_code === 0) this.setState({ ...res.data },
        () => $(this._status).prop('checked', this.state.status === 1))
      else RbHighbar.error(res.error_msg)
    })
  }

  _handleDelete() {
    const that = this
    RbAlert.create('确认删除此任务吗？', {
      type: 'danger',
      confirmText: '删除',
      confirm: function () {
        this.disabled(true)
        $.post(`/app/entity/record-delete?id=${that.props.id}`, (res) => {
          if (res.error_code === 0) {
            this.hide()
            RbHighbar.success('任务已删除')
            __TaskViewer.refreshTask('DELETE')
            __TaskViewer.hide()
          } else RbHighbar.error(res.error_msg)
        })
      }
    })
  }

  // 即时保存
  handleChange(e, call) {
    const name = e.target.name
    const value = e.target.value
    const valueOld = this.state[name]
    if ($same(value, valueOld)) {
      typeof call === 'function' && call()
      return
    }
    this.setState({ [name]: value })

    const data = {
      [name]: $.type(value) === 'array' ? value.join(',') : value,
      metadata: { id: this.props.id }
    }
    $.post('/app/entity/record-save', JSON.stringify(data), (res) => {
      if (res.error_code === 0) {
        __TaskViewer.refreshTask && __TaskViewer.refreshTask(name === 'projectPlanId' ? value : null)
        typeof call === 'function' && call()
      } else RbHighbar.error(res.error_msg)
    })
  }

  _handleChangeTaskName(e) {
    const value = e.target.value
    if (!value) {
      RbHighbar.create('任务标题不能为空')
      this._taskName.focus()
    } else {
      this.handleChange(e)
    }
  }

  _handleChangeStatus(e) {
    this.handleChange({ target: { name: 'status', value: e.target.checked ? 1 : 0 } }, () => this.fetch())
  }

  _handleChangePlan(val, e) {
    if (e.target.dataset.disabled === 'true') return
    this.handleChange({ target: { name: 'projectPlanId', value: val } }, () => this.fetch())
  }

  _handleChangePriority = (val) => this.handleChange({ target: { name: 'priority', value: val } })

  _handleChangeExecutor(val) {
    this.handleChange({ target: { name: 'executor', value: val ? val.id : null } },
      () => this.setState({ executor: val ? [val.id, val.text] : null }))
  }

  _deleteAttachment(item, e) {
    $stopEvent(e)
    const that = this
    RbAlert.create('确认删除此附件？', {
      confirm: function () {
        this.hide()
        const s = that.state.attachments.filter(x => x !== item)
        that.handleChange({ target: { name: 'attachments', value: s } })
      }
    })
  }

  _enterKey(e) {
    if (e.keyCode === 13) e.target.blur()
  }

  refreshComments() {
    this._TaskCommentsList.fetchComments()
  }
}

class TaskDescription extends React.Component {
  state = { ...this.props }
  render() {
    if (this.state.editMode) {
      return (
        <div className="form-control-plaintext">
          <TextEditor hideAttachment={true} ref={(c) => this._editor = c} />
          <div className="mt-2 text-right" ref={(c) => this._btns = c}>
            <button onClick={() => this.setState({ editMode: false })} className="btn btn-sm btn-link">取消</button>
            <button className="btn btn-sm btn-primary" onClick={() => this._handleConfirm()}>确定</button>
          </div>
        </div>
      )
    } else {
      return (
        <div className="form-control-plaintext desc" style={{ cursor: 'pointer' }} onClick={() => this._handleEditMode()}>
          {this.state.content
            ? TextEditor.renderRichContent({ content: this.state.content })
            : <div className="text-muted">点击添加</div>}
        </div>
      )
    }
  }

  UNSAFE_componentWillReceiveProps(props) {
    if (props.content !== this.state.content) this.setState({ content: props.content })
  }

  _handleEditMode() {
    this.setState({ editMode: true }, () => this._editor.focus(this.state.content))
  }

  _handleConfirm() {
    const val = this._editor.val()
    this.props.$$$parent.handleChange({ target: { name: 'description', value: val } },
      () => this.setState({ content: val, editMode: false }))
  }
}

// 评论列表
class TaskCommentsList extends React.Component {
  state = { ...this.props }

  render() {
    if ((this.state.comments || []).length === 0) return null
    return (
      <div className="comment-list-wrap">
        <h4>评论列表</h4>
        <div className="feeds-list comment-list">
          {this.state.comments.map((item) => {
            const id = `comment-${item.id}`
            return (
              <div key={id} id={id}>
                <div className="feeds">
                  <div className="user">
                    <a className="user-show">
                      <div className="avatar"><img alt="Avatar" src={`${rb.baseUrl}/account/user-avatar/${item.createdBy[0]}`} /></div>
                    </a>
                  </div>
                  <div className="content">
                    <div className="meta">
                      <a>{item.createdBy[1]}</a>
                    </div>
                    {TextEditor.renderRichContent(item)}
                    <div className="actions">
                      <div className="float-left text-muted fs-12 time">
                        <span title={item.createdOn}>{$fromNow(item.createdOn)}</span>
                      </div>
                      <ul className="list-unstyled m-0">
                        {item.self && <li className="list-inline-item mr-2">
                          <a href="#reply" onClick={() => this._handleDelete(item)} className="fixed-icon">
                            <i className="zmdi zmdi-delete" /> 删除
                          </a>
                        </li>
                        }
                        <li className="list-inline-item">
                          <a href="#reply" onClick={() => this._handleReply(item)} className="fixed-icon">
                            <i className="zmdi zmdi-mail-reply" /> 回复
                          </a>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  componentDidMount = () => this.fetchComments()

  fetchComments() {
    $.get(`/project/comments/list?task=${this.props.taskid}`, (res) => this.setState({ comments: res.data }))
  }

  _handleReply(item) {
    __TaskComment.commentState(true, `@${item.createdBy[1]} `)
  }

  _handleDelete(item) {
    RbAlert.create('确认删除该评论？', {
      confirm: function () {
        $.post(`/app/entity/record-delete?id=${item.id}`, (res) => {
          if (res.error_code !== 0) return RbHighbar.error(res.error_msg)
          const ss = this.state.comments.filter(x => x.id !== item.id)
          this.setState({ comments: ss })
        })
      }
    })
  }
}

// 任务评论
class TaskComment extends React.Component {
  state = { ...this.props }

  render() {
    return (
      <div className="comments">
        <div className="comment-reply">
          <div onClick={() => this.commentState(true)} className={`reply-mask ${this.state.openComment && 'hide'}`}>添加评论</div>
          <span className={`${!this.state.openComment && 'hide'}`}>
            <TextEditor placeholder="添加评论" ref={(c) => this._editor = c} />
            <div className="mt-2 text-right" ref={(c) => this._btns = c}>
              <button onClick={() => this.commentState(false)} className="btn btn-sm btn-link">取消</button>
              <button className="btn btn-sm btn-primary" ref={(c) => this._btn = c} onClick={() => this._post()}>评论</button>
            </div>
          </span>
        </div>
      </div>
    )
  }

  commentState = (state, initValue) => {
    this.setState({ openComment: state }, () => this.state.openComment && this._editor.focus(initValue))
  }

  _post() {
    const _data = this._editor.vals()
    if (!_data.content) return RbHighbar.create('请输入评论内容')

    _data.taskId = this.props.id
    _data.metadata = { entity: 'ProjectTaskComment' }

    $.post('/app/entity/record-save', JSON.stringify(_data), (res) => {
      if (res.error_code === 0) {
        this._editor.reset()
        this.commentState(false)
        typeof this.props.call === 'function' && this.props.call()
      } else RbHighbar.error(res.error_msg)
    })
  }
}

// ~ 编辑框
class TextEditor extends React.Component {
  state = { ...this.props }

  constructor(props) {
    super(props)

    this.__es = []
    for (let k in EMOJIS) {
      const item = EMOJIS[k]
      this.__es.push(<a key={`em-${item}`} title={k} onClick={() => this._selectEmoji(k)}><img src={`${rb.baseUrl}/assets/img/emoji/${item}`} /></a>)
    }
  }

  render() {
    return (
      <React.Fragment>
        <div className={`rich-editor ${this.state.focus ? 'active' : ''}`}>
          <textarea ref={(c) => this._editor = c} placeholder={this.props.placeholder} maxLength="2000"
            onFocus={() => this.setState({ focus: true })}
            onBlur={() => this.setState({ focus: false })}
            defaultValue={this.props.initValue} />
          <div className="action-btns">
            <ul className="list-unstyled list-inline m-0 p-0">
              <li className="list-inline-item">
                <a onClick={this._toggleEmoji} title="表情"><i className="zmdi zmdi-mood" /></a>
                <span className={`mount ${this.state.showEmoji ? '' : 'hide'}`} ref={(c) => this._emoji = c}>
                  {this.state.renderEmoji && <div className="emoji-wrapper">{this.__es}</div>}
                </span>
              </li>
              <li className="list-inline-item">
                <a onClick={this._toggleAtUser} title="@用户"><i className="zmdi at-text">@</i></a>
                <span className={`mount ${this.state.showAtUser ? '' : 'hide'}`} ref={(c) => this._atUser = c}>
                  <UserSelector hideDepartment={true} hideRole={true} hideTeam={true} hideSelection={true} multiple={false} onSelectItem={this._selectAtUser} ref={(c) => this._UserSelector = c} />
                </span>
              </li>
              {this.props.hideAttachment ? null :
                <li className="list-inline-item">
                  <a title="附件" onClick={() => this._fileInput.click()}><i className="zmdi zmdi-attachment-alt zmdi-hc-rotate-45" /></a>
                </li>
              }
            </ul>
          </div>
        </div>
        {(this.state.files || []).length > 0 && (
          <div className="attachment">
            <div className="file-field attachments">
              {(this.state.files || []).map((item) => {
                const fileName = $fileCutName(item)
                return <div key={'file-' + item} className="img-thumbnail" title={fileName}>
                  <i className="file-icon" data-type={$fileExtName(fileName)} />
                  <span>{fileName}</span>
                  <b title="移除" onClick={() => this._removeFile(item)}><span className="zmdi zmdi-close"></span></b>
                </div>
              })}
            </div>
          </div>
        )}
        <span className="hide">
          <input type="file" ref={(c) => this._fileInput = c} data-maxsize="102400000" />
        </span>
      </React.Fragment>
    )
  }
  UNSAFE_componentWillReceiveProps = (props) => this.setState(props)

  componentDidMount() {
    $(document.body).click((e) => {
      if (this.__unmount) return
      if (e.target && $(e.target).parents('li.list-inline-item').length > 0) return
      this.setState({ showEmoji: false, showAtUser: false })
    })
    autosize(this._editor)
    setTimeout(() => this.props.initValue && autosize.update(this._editor), 200)

    let mp = false
    $createUploader(this._fileInput,
      () => {
        if (!mp) {
          $mp.start()
          mp = true
        }
      },
      (res) => {
        $mp.end()
        const files = this.state.files || []
        files.push(res.key)
        this.setState({ files: files })
      })
  }

  componentWillUnmount = () => this.__unmount = true

  _toggleEmoji = () => {
    this.setState({ renderEmoji: true, showEmoji: !this.state.showEmoji }, () => {
      if (this.state.showEmoji) this.setState({ showAtUser: false })
    })
  }
  _selectEmoji(emoji) {
    $(this._editor).insertAtCursor(`[${emoji}]`)
    this.setState({ showEmoji: false })
  }

  _toggleAtUser = () => {
    this.setState({ showAtUser: !this.state.showAtUser }, () => {
      if (this.state.showAtUser) {
        this.setState({ showEmoji: false })
        this._UserSelector.openDropdown()
      }
    })
  }
  _selectAtUser = (s) => {
    $(this._editor).insertAtCursor(`@${s.text} `)
    this.setState({ showAtUser: false })
  }

  _removeFile(file) {
    const files = this.state.files
    files.remove(file)
    this.setState({ files: files })
  }

  val() { return $(this._editor).val() }
  vals() {
    return {
      content: this.val(),
      attachments: this.state.files
    }
  }
  focus(initValue) {
    if (typeof initValue !== 'undefined') {
      setTimeout(() => autosize.update(this._editor), 100)
      $(this._editor).val(initValue)
    }
    $(this._editor).selectRange(9999, 9999)  // Move to last
  }
  reset() {
    $(this._editor).val('')
    autosize.update(this._editor)
    this.setState({ files: null, images: null })
  }

  /**
   * 渲染内容
   * @param {*} data 
   */
  static renderRichContent(data) {
    // 表情和换行不在后台转换，因为不同客户端所需的格式不同
    const contentHtml = data.content ? converEmoji(data.content.replace(/\n/g, '<br />')) : '点击添加'
    return <div className="rich-content">
      <div className="texts text-break"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
      {(data.attachments || []).length > 0 && <div className="file-field">
        {data.attachments.map((item) => {
          const fileName = $fileCutName(item)
          return <a key={'file-' + item} title={fileName} onClick={() => (parent || window).RbPreview.create(item)} className="img-thumbnail">
            <i className="file-icon" data-type={$fileExtName(fileName)} /><span>{fileName}</span>
          </a>
        })}
      </div>
      }
    </div>
  }
}
