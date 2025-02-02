<template>
  <div>
    <div v-if="!fromme" class="grey p-2">
      <EmailValidator
        v-if="!me"
        ref="email"
        v-model:email="email"
        v-model:valid="emailValid"
        size="lg"
        label="Your email address:"
      />
      <MessageStillAvailable v-if="stillAvailable" class="mb-1 mt-1" />
      <NoticeMessage
        v-if="milesaway > 37 && message.type === 'Offer'"
        variant="danger"
        class="mt-2 mb-1"
      >
        <!--  The 37 miles figure comes from research from someone we shall call Clement. -->
        This item is {{ milesaway }} miles away. Before replying, are you sure
        you can collect from there?
      </NoticeMessage>
      <b-form-group
        class="flex-grow-1"
        label="Your reply:"
        :label-for="'replytomessage-' + message.id"
        :description="
          message.type === 'Offer'
            ? 'Interested?  Please explain why you\'d like it and when you can collect.  Always be polite and helpful, and remember it\'s not always first come first served.  If appropriate, ask if it\'s working.'
            : 'Can you help?  If you have what they\'re looking for, let them know.'
        "
      >
        <b-form-textarea
          v-if="message.type == 'Offer'"
          :id="'replytomessage-' + message.id"
          v-model="reply"
          rows="3"
          max-rows="8"
          class="border border-success"
        />
        <b-form-textarea
          v-if="message.type == 'Wanted'"
          :id="'replytomessage-' + message.id"
          v-model="reply"
          rows="3"
          max-rows="8"
          class="flex-grow-1"
        />
      </b-form-group>
      <p v-if="me && !alreadyAMember" class="text--small text-muted">
        You're not yet a member of this community; we'll join you. Change emails
        or leave communities from
        <em>Settings</em>.
      </p>
      <div v-if="!me">
        <NewFreegler />
      </div>
    </div>
    <hr />
    <div class="d-flex justify-content-between">
      <div class="pr-2 w-50">
        <b-button variant="secondary" size="lg" block @click="close">
          Close
        </b-button>
      </div>
      <div v-if="!fromme" class="pl-2 w-50 justify-content-end d-flex">
        <b-button
          v-if="!me"
          size="lg"
          variant="primary"
          :disabled="disableSend"
          block
          @click="registerOrSend"
        >
          Send <span class="d-none d-md-inline">your</span> reply
          <v-icon v-if="replying" icon="sync" class="fa-spin" />
          <v-icon v-else icon="angle-double-right" />&nbsp;
        </b-button>
        <b-button
          v-else
          size="lg"
          variant="primary"
          block
          :disabled="disableSend"
          @click="sendReply"
        >
          Send <span class="d-none d-md-inline">your</span> reply
          <v-icon v-if="replying" icon="sync" class="fa-spin" />
          <v-icon v-else icon="angle-double-right" />&nbsp;
        </b-button>
      </div>
    </div>
    <b-modal
      v-if="showNewUser"
      id="newUserModal"
      ref="newUserModal"
      scrollable
      ok-only
      ok-title="Close and Continue"
      title="Welcome to Freegle!"
      @hide="sendReply"
    >
      <NewUserInfo :password="newUserPassword" />
    </b-modal>
    <span ref="breakpoint" class="d-inline d-sm-none" />
    <div class="d-none">
      <ChatButton ref="replyToPostChatButton" :userid="replyToUser" />
    </div>
  </div>
</template>
<script>
import { mapWritableState } from 'pinia'
import { nextTick } from 'vue'
import { useMessageStore } from '../stores/message'
import { useAuthStore } from '../stores/auth'
import { useReplyStore } from '../stores/reply'
import { milesAway } from '../composables/useDistance'
import replyToPost from '@/mixins/replyToPost'
import MessageStillAvailable from '~/components/MessageStillAvailable'
import EmailValidator from '~/components/EmailValidator'
import NewUserInfo from '~/components/NewUserInfo'
import ChatButton from '~/components/ChatButton'

const NewFreegler = () => import('~/components/NewFreegler')

export default {
  components: {
    ChatButton,
    MessageStillAvailable,
    EmailValidator,
    NewFreegler,
    NewUserInfo,
  },
  mixins: [replyToPost],
  props: {
    id: {
      type: Number,
      required: true,
    },
    messageOverride: {
      type: Object,
      required: false,
      default: null,
    },
  },
  async setup(props) {
    const messageStore = useMessageStore()
    const authStore = useAuthStore()

    await messageStore.fetch(props.id)

    return {
      messageStore,
      authStore,
    }
  },
  data() {
    return {
      reply: null,
      replying: false,
      email: null,
      emailValid: false,
      showNewUser: false,
      newUserPassword: null,
    }
  },
  computed: {
    message() {
      return this.messageStore?.byId(this.id)
    },
    milesaway() {
      return milesAway(
        this.me?.lat,
        this.me?.lng,
        this.message?.lat,
        this.message?.lng
      )
    },
    stillAvailable() {
      return (
        this.message?.type === 'Offer' &&
        this.reply &&
        this.reply.length <= 35 &&
        this.reply.toLowerCase().includes('still available')
      )
    },
    disableSend() {
      return this.replying || !this.reply || (!this.me && !this.emailValid)
    },
    fromme() {
      return this.message?.fromuser === this.myid
    },
    alreadyAMember() {
      let found = false

      if (this.message?.groups) {
        for (const messageGroup of this.message?.groups) {
          Object.keys(this.myGroups).forEach((key) => {
            const group = this.myGroups[key]

            if (messageGroup.groupid === group.id) {
              found = true
            }
          })
        }
      }

      return found
    },
    ...mapWritableState(useAuthStore, ['loggedInEver', 'forceLogin']),
  },
  watch: {
    me(newVal, oldVal) {
      console.log('Login change', newVal, oldVal)
      if (!oldVal && newVal && this.reply) {
        // We have now logged in - resume our send.
        console.log('Resume send')
        this.sendReply()
      }
    },
  },
  methods: {
    async registerOrSend() {
      // We've got a reply and an email address.  Maybe the email address is a registered user, maybe it's new.  If
      // it's a registered user then we want to force them to log in.
      //
      // We attempt to register the user.  If the user already exists, then we'll be told about that as an error.
      console.log('Register or send', this.email)

      try {
        const ret = await this.$api.user.add(this.email, false)

        console.log('Returned', ret)
        if (ret.ret === 0 && ret.password) {
          // We registered a new user and logged in.
          this.loggedInEver = true

          await this.fetchMe(['me'], true)

          // Show the new user modal.
          this.newUserPassword = ret.password
          this.showNewUser = true

          await nextTick()

          // Now that we are logged in, we can reply.
          this.$refs.newUserModal?.show()

          // Once the modal is closed, we will send the reply.
        } else {
          // If anything else happens, then we call sendReply which will force us to log in.  Then the watch will
          // spot that we're logged in and trigger the send, so we don't need to do that here.
          console.log('Failed to register - force login', ret)
          this.forceLogin = true
        }
      } catch (e) {
        // Probably an existing user.  Force ourselves to log in as above.
        console.log('Register exception, force login', e.message)
        this.forceLogin = true
      }
    },
    async sendReply() {
      console.log('sendReply', this.reply)

      if (this.reply) {
        // Save the reply
        const replyStore = useReplyStore()
        replyStore.replyMsgId = this.id
        replyStore.replyMessage = this.reply
        replyStore.replyingAt = Date.now()
        console.log(
          'State',
          useReplyStore().replyMsgId,
          useReplyStore().replyMessage,
          useReplyStore().replyingAt
        )

        if (this.me) {
          // We have several things to do:
          // - join a group if need be (doesn't matter which)
          // - post our reply
          // - show/go to the open the popup chat so they see what happened
          this.replying = true
          let found = false
          let tojoin = null

          // We shouldn't need to fetch, but we've seen a Sentry issue where the message groups are not valid.
          const msg = await this.messageStore.fetch(this.id, true)

          if (msg) {
            for (const messageGroup of msg.groups) {
              tojoin = messageGroup.groupid
              Object.keys(this.myGroups).forEach((key) => {
                const group = this.myGroups[key]

                if (messageGroup.groupid === group.id) {
                  found = true
                }
              })
            }

            if (!found) {
              // Not currently a member.
              await this.authStore.joinGroup(this.myid, tojoin, false)
            }

            // Now we can send the reply via chat.
            await this.$nextTick()
            await this.replyToPost()
          }
        } else {
          // We're not logged in yet.  We need to force a log in.  Once that completes then either the watch in here
          // or default.vue will spot we have a reply to send and make it happen.
          console.log('Force login')
          this.forceLogin = true
        }
      }
    },
    close() {
      this.$emit('close')
    },
    sent() {
      this.$emit('sent')
    },
  },
}
</script>
<style scoped lang="scss">
.grey {
  background-color: $color-gray--lighter;
}

:deep(.phone) {
  border: 2px solid $color-gray--normal !important;
}

.nobot {
  margin-bottom: 0 !important;
}
</style>
