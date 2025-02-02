import { defineStore } from 'pinia'
import { nextTick } from 'vue'
import api from '~/api'

export const useNewsfeedStore = defineStore({
  id: 'newsfeed',
  state: () => ({
    // This is a barebones list of items in order.
    feed: [],

    // This is the list of full items we've fetched.
    list: {},

    // Max seen
    maxSeen: 0,

    // Count of interesting items
    count: 0,
  }),
  actions: {
    init(config) {
      this.config = config
      this.maxSeen = 0
      this.fetching = {}
    },
    reset() {
      const init = this.config
      this.$reset()
      this.config = init
    },
    async fetchCount(log = true) {
      const ret = await api(this.config).news.count(log)
      this.count = ret?.count
      return this.count
    },
    addItems(items) {
      const prevMax = this.maxSeen

      items.forEach((item) => {
        if (item.id > this.maxSeen) {
          this.maxSeen = item.id
        }

        this.list[item.id] = item

        if (item.replies?.length) {
          this.addItems(item.replies)
        }
      })

      if (this.maxSeen > prevMax) {
        api(this.config).news.seen(this.maxSeen)
        this.fetchCount()
      }
    },
    async fetchFeed(distance) {
      this.feed = await api(this.config).news.fetch(null, distance)
      return this.feed
    },
    async fetch(id, force, lovelist) {
      try {
        if (!this.list[id] || force) {
          if (!this.fetching[id]) {
            this.fetching[id] = api(this.config).news.fetch(
              id,
              null,
              lovelist,
              false
            )
          }

          const ret = await this.fetching[id]
          await nextTick()
          this.fetching[id] = null

          if (ret?.id) {
            this.list[id] = ret

            this.addItems([ret])
          }
        } else if (this.list[id]) {
          // We have it in the store, but we should kick off a fetch anyway to update it.
          if (!this.fetching[id]) {
            this.fetching[id] = api(this.config)
              .news.fetch(id, null, lovelist, false)
              .then((ret) => {
                this.fetching[id] = null
                if (ret?.id) {
                  this.list[id] = ret

                  this.addItems([ret])
                }
              })
          }
        }
      } catch (e) {
        console.log('Fetch of newsfeed failed', id, e)
      }

      return this.list[id]
    },
    async love(id, threadhead) {
      await api(this.config).news.love(id)
      await this.fetch(threadhead, true)
    },
    async unlove(id, threadhead) {
      await api(this.config).news.unlove(id)
      await this.fetch(threadhead, true)
    },
    async send(message, replyto, threadhead, imageid) {
      if (message) {
        // Removing the enter on the end can prevent some duplicates.
        message = message.trim()
      }

      const id = await api(this.config).news.send({
        message,
        replyto,
        threadhead,
        imageid,
      })

      if (!threadhead) {
        await this.fetchFeed()
      } else {
        await this.fetch(threadhead, true)
      }

      return id
    },
    async edit(id, message, threadhead) {
      await api(this.config).news.edit(id, message)
      await this.fetch(threadhead, true)
    },
    async delete(id, threadhead) {
      await api(this.config).news.del(id)

      if (id !== threadhead) {
        await this.fetch(threadhead, true)
      } else {
        this.list[id] = null
        this.feed = this.feed.filter((item) => item.id !== id)
      }
    },
    async unfollow(id) {
      await api(this.config).news.unfollow(id)
    },
    async unhide(id) {
      await api(this.config).news.unhide(id)
      await this.fetch(id, true)
    },
    async referTo(id, type) {
      await api(this.config).news.referto(id, type)
      await this.fetch(id, true)
    },
    async report(id, reason) {
      await api(this.config).news.report(id, reason)
    },
  },
  getters: {
    byId: (state) => (id) => {
      return state.list[id]
    },
    tagusers(state) {
      let ret = []
      const userids = {}

      for (const id in state.list) {
        const item = state.list[id]

        if (item?.userid && item?.displayname) {
          if (!userids[item.userid]) {
            userids[item.userid] = true
            ret.push({
              id: item.userid,
              displayname: item.displayname,
            })
          }
        }

        if (item?.replies?.length) {
          for (const reply of item.replies) {
            if (reply.userid && reply.displayname) {
              if (!userids[reply.userid]) {
                userids[reply.userid] = true
                ret.push({
                  id: reply.userid,
                  displayname: reply.displayname,
                })
              }
            }
          }
        }
      }

      ret = ret.sort((a, b) => {
        return a.displayname
          .toLowerCase()
          .localeCompare(b.displayname.toLowerCase())
      })

      return ret
    },
  },
})
