<template>
  <div>
    <div class="d-flex flex-wrap align-content-center">
      <b-form-group
        class="nobot mr-2"
        :label="label"
        :description="description"
      >
        <b-input-group>
          <b-form-input
            v-if="me"
            v-model="me.phone"
            placeholder="Your mobile"
            :size="size"
            lazy
            :class="inputClass"
          />
          <b-input-group-append v-if="!autoSave">
            <b-button variant="white" @click="savePhone">
              <v-icon
                v-if="savingPhone"
                icon="sync"
                class="text-success fa-spin"
              />
              <v-icon
                v-else-if="savedPhone"
                icon="check"
                class="text-success"
              />
              <v-icon v-else icon="save" />
              Save
            </b-button>
          </b-input-group-append>
        </b-input-group>
        <div class="text-muted mt-1 mb-1 text--small">
          <v-icon icon="lock" /> Other freeglers won't see this.
        </div>
      </b-form-group>
      <b-button
        v-if="!hideRemove && me?.phone"
        variant="link"
        class="align-self-start"
        size="sm"
        @click="removePhone"
      >
        Remove
      </b-button>
    </div>
    <p v-if="notMobile" class="text-danger">Please enter a mobile number.</p>
  </div>
</template>
<script>
import { useAuthStore } from '../stores/auth'

export default {
  props: {
    size: {
      type: String,
      required: false,
      default: 'md',
    },
    label: {
      type: String,
      required: false,
      default: null,
    },
    description: {
      type: String,
      required: false,
      default: null,
    },
    hideRemove: {
      type: Boolean,
      required: false,
      default: false,
    },
    autoSave: {
      type: Boolean,
      required: false,
      default: false,
    },
    inputClass: {
      type: String,
      required: false,
      default: null,
    },
  },
  setup() {
    const authStore = useAuthStore()

    return {
      authStore,
    }
  },
  data() {
    return {
      savingPhone: false,
      savedPhone: false,
    }
  },
  computed: {
    notMobile() {
      if (!this.me?.phone) {
        return false
      }

      return (
        !(this.me.phone + '').startsWith('+447') &&
        !(this.me.phone + '').startsWith('07')
      )
    },
    phone() {
      return this.me && this.me.phone ? this.me.phone : null
    },
  },
  watch: {
    phone(newVal) {
      if (this.autoSave) {
        this.savePhone()
      }
    },
  },
  methods: {
    async savePhone() {
      if (!this.notMobile) {
        this.savingPhone = true

        await this.authStore.saveAndGet({
          phone: this.me.phone,
        })

        this.savingPhone = false
        this.savedPhone = true
        setTimeout(() => {
          this.savedPhone = false
        }, 2000)
      }
    },
    async removePhone() {
      setTimeout(() => {
        this.me.phone = null
      }, 1000)

      await this.authStore.saveAndGet({
        phone: '',
      })
    },
  },
}
</script>
<style scoped lang="scss">
.nobot {
  margin-bottom: 0 !important;
}
</style>
