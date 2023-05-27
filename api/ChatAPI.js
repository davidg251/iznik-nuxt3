import BaseAPI from '@/api/BaseAPI'

export default class ChatAPI extends BaseAPI {
  fetchMessages(chatid) {
    return this.$getv2(`/chat/${chatid}/message`)
  }

  async listChats(since, search, logError) {
    return await this.$getv2(
      '/chat',
      {
        since,
        search,
      },
      logError
    )
  }

  fetchChat(chatid, logError) {
    return this.$getv2('/chat/' + chatid, {}, logError)
  }

  markRead(chatid, lastmsg, allowback) {
    return this.$post('/chatrooms', {
      id: chatid,
      lastmsgseen: lastmsg,
      allowback,
    })
  }

  openChat(params, logError) {
    return this.$put('/chat/rooms', params, logError)
  }

  send(data) {
    return this.$post('/chatmessages', data, function (data) {
      if (data && data.ret === 4) {
        // Don't log errors for banned users - handled elsewhere.
        return false
      } else {
        return true
      }
    })
  }

  nudge(chatid) {
    return this.$post('/chatrooms', {
      id: chatid,
      action: 'Nudge',
    })
  }

  hideChat(chatid) {
    return this.$post('/chatrooms', { id: chatid, status: 'Closed' })
  }

  blockChat(chatid) {
    return this.$post('/chatrooms', { id: chatid, status: 'Blocked' })
  }

  rsvp(id, chatid, value) {
    return this.$patch('/chatmessages', {
      roomid: chatid,
      id,
      replyexpected: value,
    })
  }

  typing(chatid) {
    return this.$post('/chatrooms', { id: chatid, action: 'Typing' })
  }
}
