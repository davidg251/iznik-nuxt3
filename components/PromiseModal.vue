<template>
  <b-modal
    ref="modal"
    scrollable
    title="Promise something to someone"
    size="lg"
    no-stacking
    @shown="onShow"
  >
    <template #default>
      <notice-message class="mb-3">
        This lets them know you're planning to give it to them, and helps you
        keep track. You can change your mind later if it doesn't work out, using
        the <em>Unpromise</em> button.
      </notice-message>
      <p>You're promising:</p>
      <b-form-select
        v-model="message"
        :options="messageOptions"
        class="mb-2 font-weight-bold"
      />
      <div>
        <label for="who" class="font-weight-normal">...to:</label>
        <b-form-select
          id="who"
          v-model="currentlySelected"
          :options="userOptions"
          class="mb-2 font-weight-bold"
        />
      </div>
      <p class="mt-2">
        If you've organised a date and time for the handover, then please tell
        us so that we can remind both of you, which makes things go more
        smoothly.
      </p>
      <div class="d-flex justify-content-between flex-wrap">
        <div>
          <label for="date"> Handover on: </label>
          <b-input-group class="mb-3">
            <b-form-input
              id="date"
              ref="dateInput"
              v-model="formattedDate"
              type="text"
              placeholder="No day yet"
              autocomplete="off"
              class="d-none"
            />
            <b-input-group-append>
              <b-form-input
                id="date"
                v-model="date"
                type="date"
                placeholder="Choose a day"
                :min="minDate"
                :max="maxDate"
              />
            </b-input-group-append>
          </b-input-group>
        </div>
        <div>
          <label for="time">at:</label>
          <b-form-input
            id="time"
            v-model="time"
            type="time"
            placeholder="Choose a time"
            step="900"
            :offset="-10"
            menu-class="border-primary shadow-lg"
            :class="formattedDate && !time ? 'border-danger' : ''"
          />
        </div>
        <div class="d-flex flex-column justify-content-center">
          <b-button
            v-if="time && tryst?.id"
            variant="link"
            @click="deleteTryst"
          >
            Cancel
          </b-button>
          <b-button v-else-if="date || time" variant="link" @click="clearTryst">
            Clear
          </b-button>
        </div>
      </div>
      <b-alert v-if="showOddTime" :model-value="true" variant="warning">
        This is an early/late time. Just saying, in case it's not right.
      </b-alert>
      <p class="mt-2">
        <span v-if="formattedDate && !time" class="text-danger font-weight-bold"
          >Please add a time.</span
        >
        If you don't want to specify a precise day and time yet, clear the day
        and click the <em>Promise</em> button. You can come back here later.
      </p>
    </template>
    <template #footer>
      <b-button variant="white" @click="hide"> Cancel </b-button>
      <b-button variant="primary" :disabled="buttonDisabled" @click="promise">
        Promise
      </b-button>
    </template>
  </b-modal>
</template>
<script>
import dayjs from 'dayjs'
import { useTrystStore } from '../stores/tryst'
import { useMessageStore } from '../stores/message'
import { useModal } from '~/composables/useModal'

const NoticeMessage = () => import('~/components/NoticeMessage')

export default {
  components: {
    NoticeMessage,
  },

  props: {
    messages: {
      validator: (prop) => typeof prop === 'object' || prop === null,
      required: true,
    },
    selectedMessage: {
      type: Number,
      required: false,
      default: 0,
    },
    users: {
      validator: (prop) => typeof prop === 'object' || prop === null,
      required: true,
    },
    selectedUser: {
      type: Number,
      required: false,
      default: 0,
    },
  },
  setup() {
    const trystStore = useTrystStore()
    const messageStore = useMessageStore()
    const { modal, hide } = useModal()

    return {
      trystStore,
      messageStore,
      modal,
      hide,
    }
  },
  data() {
    return {
      message: null,
      date: null,
      time: null,
      formattedDate: null,
      showOddTime: false,
      currentlySelected: null,
    }
  },
  computed: {
    minDate() {
      return dayjs().format('YYYY-MM-DD')
    },
    maxDate() {
      return dayjs().add(14, 'day').format('YYYY-MM-DD')
    },
    buttonDisabled() {
      return (
        this.currentlySelected <= 0 ||
        !this.messages ||
        this.messages.length === 0 ||
        !this.message ||
        // This is fun.  Because && returns one of the values, it doesn't return true or false.  Try hard.
        // eslint-disable-next-line
        (this.formattedDate && !this.time ? true : false)
      )
    },
    messageOptions() {
      const options = []

      if (this.messages) {
        if (this.messages.length > 1) {
          options.push({
            value: 0,
            text: '-- Please choose --',
          })
        }

        for (const message of this.messages) {
          if (
            message.type === 'Offer' &&
            (!message.outcomes || message.outcomes.length === 0)
          ) {
            options.push({
              value: message.id,
              text: message.subject,
            })
          }
        }
      } else {
        options.push({
          value: 0,
          text: '...Loading...',
          selected: true,
        })
      }

      return options
    },
    userOptions() {
      const options = []

      if (this.users) {
        if (this.users.length > 1) {
          options.push({
            value: 0,
            text: '-- Please choose a user --',
            selected: this.currentlySelected === 0,
          })
        }

        for (const user of this.users) {
          options.push({
            value: user.id,
            text: user.displayname,
            selected: parseInt(this.message) === parseInt(user.id),
          })
        }
      }

      return options
    },
    tryst() {
      return this.currentlySelected
        ? this.trystStore?.getByUser(this.currentlySelected)
        : null
    },
  },
  watch: {
    messages: {
      immediate: true,
      handler(newVal) {
        let selected = false

        if (newVal) {
          // Maybe the selected message we picked up from a chat no longer exists.
          newVal.forEach((m) => {
            if (
              (!m.outcomes || m.outcomes.length === 0) &&
              parseInt(m.id) === parseInt(this.message)
            ) {
              selected = true
              this.message = m.id
            }
          })

          if (!selected) {
            this.message = 0
          }
        }
      },
    },
    tryst: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          const d = dayjs(newVal.arrangedfor)
          this.date = d.format('YYYY-MM-DD')
          this.time = d.format('HH:mm:ss')
        } else {
          this.date = null
          this.time = null
        }
      },
    },
  },
  methods: {
    async promise() {
      if (this.currentlySelected > 0) {
        await this.messageStore.promise(this.message, this.currentlySelected)

        console.log('Date arranged for', this.time, this.date)

        if (this.time && !this.time.includes(':')) {
          // We've seen in Sentry that this can happen - looks like if someone types into the hours but not the minutes.
          this.time = this.time + ':00'
        }

        const arrangedfor =
          this.time && this.date
            ? dayjs(this.date + ' ' + this.time).toISOString()
            : null

        if (arrangedfor) {
          if (!this.tryst) {
            // No arrangement yet.
            await this.trystStore.add(
              this.myid,
              this.currentlySelected,
              arrangedfor
            )
          } else {
            // Update
            await this.trystStore.edit(this.tryst.id, arrangedfor)
          }
        }

        this.hide()
      }
    },
    async onShow(date) {
      this.message = this.selectedMessage

      this.currentlySelected = null

      if (this.selectedUser) {
        this.currentlySelected = this.selectedUser
      } else if (this.users && this.users.length === 1) {
        this.currentlySelected = this.users[0].id
      }

      // Fetch any existing trysts.
      await this.trystStore.fetch()

      // We can get called with a pointer event.
      if (date && typeof date.format === 'function') {
        // Explicit date -set it (overriding any in the tryst).
        this.$nextTick(() => {
          this.date = date.format('YYYY-MM-DD')
        })
      }
    },
    onContext(ctx) {
      if (ctx.selectedYMD) {
        this.formattedDate = dayjs(ctx.selectedYMD).format('dddd Do')
      } else {
        this.formattedDate = null
      }
    },
    deleteTryst() {
      this.trystStore.delete(this.tryst.id)
    },
    clearTryst() {
      this.date = null
      this.time = null
    },
    considerOddTime() {
      this.showOddTime =
        this.time && (this.time < '07:00' || this.time > '21:00')
    },
  },
}
</script>
<style scoped>
label {
  font-weight: bold;
}
</style>
