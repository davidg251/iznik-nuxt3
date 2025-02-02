<template>
  <client-only v-if="me">
    <b-container fluid class="p-0 p-xl-2">
      <h1 class="visually-hidden">Browse items</h1>
      <b-row class="m-0">
        <b-col cols="0" lg="3" class="p-0 pr-1">
          <VisibleWhen
            :not="['xs', 'sm', 'md', 'lg']"
            class="position-fixed modal-above-fade"
            style="width: 300px"
          >
            <ExternalDa
              ad-unit-path="/22794232631/freegle_home_left"
              :dimensions="[300, 250]"
              div-id="div-gpt-ad-1691925450433-0"
              class="mt-2"
            />
          </VisibleWhen>
          <VisibleWhen :at="['lg', 'xl', 'xxl']">
            <SidebarLeft />
          </VisibleWhen>
        </b-col>
        <b-col cols="12" lg="6" class="p-0">
          <MicroVolunteering />
          <div>
            <GlobalWarning />
            <ExpectedRepliesWarning
              v-if="me && me.expectedreplies"
              :count="me.expectedreplies"
              :chats="me.expectedchats"
            />
            <GiveAsk mobile />
          </div>
          <div v-if="initialBounds">
            <div v-if="browseView === 'mygroups'" class="bg-white mt-2">
              <div class="small d-flex justify-content-end">
                <div>
                  <!-- eslint-disable-next-line-->
                  Show posts from <b-button variant="link" class="mb-1 p-0" size="sm" @click="showPostsFromNearby">nearby instead</b-button>.
                </div>
              </div>
              <AdaptiveMap
                :key="'map-' + bump"
                :initial-bounds="initialBounds"
                :initial-search="searchTerm"
                class="mt-2"
                force-messages
                group-info
                jobs
                :show-many="false"
                can-hide
                track
              />
            </div>
            <div v-else>
              <div class="mb-1 border p-2 bg-white">
                <NoticeMessage
                  v-if="!messagesOnMapCount && !me?.settings?.mylocation"
                  variant="warning"
                >
                  There are no posts in this area at the moment. You can check
                  back later, or use the controls below:
                  <ul>
                    <li>
                      The <em>Travel time</em> slider lets you see posts from
                      further away.
                    </li>
                    <li>
                      <!-- eslint-disable-next-line-->
                      You can change your location in <nuxt-link  no-prefetch to="/settings">Settings</nuxt-link>.
                    </li>
                    <li>
                      The <em>Add location</em> link lets you show posts from
                      another postcode.
                    </li>
                  </ul>
                </NoticeMessage>
                <NoticeMessage v-if="!isochrones.length" variant="warning">
                  <p class="font-weight-bold">
                    What's your postcode? We'll show you posts nearby.
                  </p>
                  <PostCode @selected="savePostcode" />
                </NoticeMessage>
                <IsoChrones />
                <div class="small mt-1">
                  <!-- eslint-disable-next-line-->
                  Show all posts from <b-button variant="link" size="sm" class="mb-1 p-0" @click="showPostsFromMyGroups">my communities</b-button> instead.
                </div>
              </div>
              <IsochronePostMapAndList
                :key="'map-' + bump"
                v-model:messagesOnMapCount="messagesOnMapCount"
                :initial-bounds="initialBounds"
                :initial-search="searchTerm"
                class="mt-2"
                force-messages
                group-info
                jobs
                :show-many="false"
                can-hide
              />
            </div>
          </div>
          <about-me-modal
            v-if="showAboutMeModal"
            :review="reviewAboutMe"
            @hidden="showAboutMeModal = false"
          />
        </b-col>
        <b-col cols="0" lg="3" class="p-0 pl-1">
          <div class="d-flex justify-content-end">
            <VisibleWhen
              :not="['xs', 'sm', 'md', 'lg']"
              class="position-fixed modal-above-fade"
              style="right: 5px"
            >
              <ExternalDa
                ad-unit-path="/22794232631/freegle_home"
                :dimensions="[300, 250]"
                div-id="div-gpt-ad-1691925450433-1"
                class="mt-2"
              />
            </VisibleWhen>
          </div>
        </b-col>
      </b-row>
    </b-container>
  </client-only>
</template>
<script>
import dayjs from 'dayjs'
import { useRoute, useRouter } from 'vue-router'
import { defineAsyncComponent } from 'vue'
import { loadLeaflet } from '~/composables/useMap'
import { buildHead } from '~/composables/useBuildHead'
import VisibleWhen from '~/components/VisibleWhen'
import { useMiscStore } from '~/stores/misc'
import { useAuthStore } from '~/stores/auth'
import { useGroupStore } from '~/stores/group'
import { useIsochroneStore } from '~/stores/isochrone'
import GiveAsk from '~/components/GiveAsk'

const MicroVolunteering = () => import('~/components/MicroVolunteering.vue')

export default {
  components: {
    GiveAsk,
    AdaptiveMap: defineAsyncComponent(() => import('~/components/AdaptiveMap')),
    IsochronePostMapAndList: defineAsyncComponent(() =>
      import('~/components/IsochronePostMapAndList')
    ),
    GlobalWarning: defineAsyncComponent(() =>
      import('~/components/GlobalWarning')
    ),
    AboutMeModal: defineAsyncComponent(() =>
      import('~/components/AboutMeModal')
    ),
    ExpectedRepliesWarning: defineAsyncComponent(() =>
      import('~/components/ExpectedRepliesWarning')
    ),
    VisibleWhen,
    MicroVolunteering,
  },
  async setup() {
    definePageMeta({
      layout: 'login',
      alias: ['/communities'],
    })
    const route = useRoute()
    const runtimeConfig = useRuntimeConfig()

    useHead(
      buildHead(
        route,
        runtimeConfig,
        'Browse',
        'See OFFERs and WANTEDs',
        null,
        {
          class: 'overflow-y-scroll',
        }
      )
    )

    const router = useRouter()
    const miscStore = useMiscStore()
    const authStore = useAuthStore()
    const groupStore = useGroupStore()
    const isochroneStore = useIsochroneStore()

    const searchTerm = route.params.term

    // We want this to be our next home page.
    const existingHomepage = miscStore.get('lasthomepage')

    if (existingHomepage !== 'mygroups') {
      miscStore.set({
        key: 'lasthomepage',
        value: 'mygroups',
      })
    }

    // Also get all the groups.  This allows us to suggest other groups to join from within the map.
    // Doing this now slows down the load, but reduces flicker.
    await groupStore.fetch()

    const martop1 = ref('285px')

    return {
      route,
      router,
      miscStore,
      authStore,
      groupStore,
      isochroneStore,
      searchTerm,
      martop1,
    }
  },
  data() {
    return {
      initialBounds: null,
      bump: 1,
      showAboutMeModal: false,
      reviewAboutMe: false,
      messagesOnMapCount: 0,
    }
  },
  computed: {
    browseView() {
      return this?.me?.settings?.browseView
        ? this.me.settings.browseView
        : 'nearby'
    },
    isochrones() {
      return this.isochroneStore?.list
    },
  },
  watch: {
    me: {
      immediate: true,
      async handler(newVal, oldVal) {
        if (newVal && !oldVal && process.client) {
          await loadLeaflet()
          this.calculateInitialMapBounds(!this.searchTerm)
          this.bump++
        }
      },
    },
  },
  async mounted() {
    if (this.me) {
      const lastask = this.miscStore?.get('lastaboutmeask')
      const now = new Date().getTime()

      if (!lastask || now - lastask > 90 * 24 * 60 * 60 * 1000) {
        // Not asked too recently.
        await this.fetchMe(true)

        if (this.me) {
          if (!this.me.aboutme || !this.me.aboutme.text) {
            // We have not yet provided one.
            const daysago = dayjs().diff(dayjs(this.me.added), 'days')

            if (daysago > 7) {
              // Nudge to ask people to to introduce themselves.
              this.showAboutMeModal = true
            }
          } else {
            const monthsago = dayjs().diff(
              dayjs(this.me.aboutme.timestamp),
              'months'
            )

            if (monthsago >= 6) {
              // Old.  Ask them to review it.
              this.showAboutMeModal = true
              this.reviewAboutMe = true
            }
          }
        }
      }

      if (this.showAboutMeModal) {
        this.miscStore.set({
          key: 'lastaboutmeask',
          value: now,
        })
      }
    }
  },
  methods: {
    async calculateInitialMapBounds(fetchIsochrones) {
      if (process.client) {
        // The initial bounds for the map are determined from the isochrones if possible.  We might have them cached
        // in store.
        const promises = []
        promises.push(this.isochroneStore.fetch())

        if (fetchIsochrones) {
          // By default we'll be showing the isochrone view in PostMap, so start the fetch of the messages now.  That
          // way we can display the list rapidly.  Fetching this and the isochrones in parallel reduces latency.
          promises.push(this.isochroneStore.fetchMessages(true))
        }

        await Promise.all(promises)

        this.initialBounds = this.isochroneStore.bounds

        if (!this.initialBounds) {
          // We don't have any isochrones yet. Use the bounding box of the group that our own
          // location is within.
          let mylat = null
          let mylng = null

          let swlat = null
          let swlng = null
          let nelat = null
          let nelng = null

          if (this.me && (this.me.lat || this.me.lng)) {
            mylat = this.me.lat
            mylng = this.me.lng

            this.myGroups.forEach(async (g) => {
              if (g.bbox) {
                await loadLeaflet()
                const wkt = new window.Wkt.Wkt()
                wkt.read(g.bbox)
                const obj = wkt.toObject()

                if (obj?.getBounds) {
                  const thisbounds = obj.getBounds()
                  const thissw = thisbounds.getSouthWest()
                  const thisne = thisbounds.getNorthEast()

                  if (
                    mylat >= thissw.lat &&
                    mylat <= thisne.lat &&
                    mylng >= thissw.lng &&
                    mylng <= thisne.lng
                  ) {
                    swlat = (thissw.lat + thisne.lat) / 2
                    swlng = thissw.lng
                    nelat = (thissw.lat + thisne.lat) / 2
                    nelng = thisne.lng
                  }
                }
              }
            })
          }

          let bounds = null

          if (
            swlat !== null &&
            swlng !== null &&
            nelat !== null &&
            nelng !== null
          ) {
            bounds = [
              [swlat, swlng],
              [nelat, nelng],
            ]
          } else if (this.me && mylat !== null && mylng !== null) {
            // We're not a member of any groups, but at least we know where we are.  Centre there, and then let
            // the map zoom to somewhere sensible.
            bounds = [
              [mylat - 0.01, mylng - 0.01],
              [mylat + 0.01, mylng + 0.01],
            ]
          } else {
            // We aren't a member of any groups and we don't know where we are.  This can happen, but it's rare.
            // Send them to the explore page to pick somewhere.
            this.router.push('/explore')
          }

          if (bounds) {
            this.initialBounds = bounds
          }
        }
      }
    },
    async showPostsFromNearby() {
      const settings = this.me.settings
      settings.browseView = 'nearby'

      await this.authStore.saveAndGet({
        settings,
      })
    },
    async showPostsFromMyGroups() {
      const settings = this.me.settings
      settings.browseView = 'mygroups'

      await this.authStore.saveAndGet({
        settings,
      })
    },
    async savePostcode(pc) {
      const settings = this.me.settings

      if (!settings?.mylocation || settings?.mylocation.id !== pc.id) {
        settings.mylocation = pc
        await this.authStore.saveAndGet({
          settings,
        })

        // Now get an isochrone at this location.
        await this.isochroneStore.fetch()
      }
    },
  },
}
</script>
<style scoped lang="scss">
.selection__wrapper {
  background-color: $color-blue--x-light;
  border: 1px solid $color-blue-x-light2;
  border-radius: 3px;
}

.typeSelect {
  max-width: 33%;
}
</style>
