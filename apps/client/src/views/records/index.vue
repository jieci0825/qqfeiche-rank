<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiErrorMessage, listAllRecords } from '@/api'
import { usePublicQuery } from '@/composables/use-public-query'
import { Icon } from '@/icons'
import RecordCard from './components/RecordCard.vue'
import { trackDistance, trackDistanceLabels } from './record-display'

const sortOptions = [
    { label: '保持时长', value: 'holding' },
    { label: '最近上榜', value: 'recent' },
] as const
const distanceOptions = [
    { label: '全部', value: '' },
    { label: trackDistanceLabels.short, value: 'short' },
    { label: trackDistanceLabels.medium, value: 'medium' },
    { label: trackDistanceLabels.long, value: 'long' },
] as const

interface RecordFilters {
    keyword: string
    stars: string
    sort: typeof sortOptions[number]['value']
    distance: typeof distanceOptions[number]['value']
}

const starOptions = [
    { label: '全部', value: '' },
    ...[1, 2, 3, 4, 5, 6, 7].map(stars => ({
        label: `${stars} 星`,
        value: String(stars),
    })),
]
const starsId = useId()
const starsDropdown = ref<HTMLDivElement | null>(null)
const starsTrigger = ref<HTMLButtonElement | null>(null)
const starsList = ref<HTMLUListElement | null>(null)
const starsOpen = ref(false)
const activeStarIndex = ref(0)
const route = useRoute()
const router = useRouter()

const filters = computed<RecordFilters>(() => {
    const { q, stars, sort, distance } = route.query
    return {
        keyword: typeof q === 'string' ? q.trim().slice(0, 100) : '',
        stars: typeof stars === 'string' && /^[1-7]$/.test(stars) ? stars : '',
        sort: sort === 'recent' ? 'recent' : 'holding',
        distance: distanceOptions.find(option => option.value === distance)?.value ?? '',
    }
})
const keyword = ref(filters.value.keyword)
const { data, error, loading, retry } = usePublicQuery(undefined, (_, signal) => listAllRecords(signal))
const hasSearch = computed(() => Boolean(filters.value.keyword || filters.value.stars || filters.value.distance))
const hasFilters = computed(() => hasSearch.value || filters.value.sort !== 'holding')
const filteredRecords = computed(() => {
    const { keyword, stars, distance, sort } = filters.value
    const search = normalizeSearch(keyword)
    const records = (data.value?.items ?? []).filter(({ track, current }) => {
        if (stars && track.stars !== Number(stars)) return false
        if (distance && trackDistance(current.timeMs) !== distance) return false
        return !search || [track.name, current.driver.name, current.team?.name]
            .some(name => name !== undefined && normalizeSearch(name).includes(search))
    })

    return records.sort(({ current: left }, { current: right }) =>
        sort === 'holding'
            ? right.holdingMs - left.holdingMs
            : Date.parse(right.effectiveAt) - Date.parse(left.effectiveAt),
    )
})

function normalizeSearch(value: string) {
    return value.normalize('NFKC').trim().toLowerCase()
}

watch(() => filters.value.keyword, value => { keyword.value = value })
watch(keyword, (value, _, onCleanup) => {
    if (value.trim() === filters.value.keyword) return
    const timeout = window.setTimeout(applySearch, 250)
    onCleanup(() => window.clearTimeout(timeout))
})

function updateFilters(changes: Partial<RecordFilters> = {}) {
    const { keyword: search, stars, sort, distance } = { ...filters.value, keyword: keyword.value.trim(), ...changes }
    const query = {
        q: search || undefined,
        stars: stars || undefined,
        sort: sort === 'holding' ? undefined : sort,
        distance: distance || undefined,
    }
    void router.replace({ name: 'records', query })
}

function applySearch() {
    if (keyword.value.trim() !== filters.value.keyword) updateFilters()
}

function resetFilters() {
    keyword.value = ''
    updateFilters({ stars: '', sort: 'holding', distance: '' })
}

async function openStars() {
    activeStarIndex.value = starOptions.findIndex(option => option.value === filters.value.stars)
    starsOpen.value = true
    await nextTick()
    starsList.value?.focus()
    scrollActiveStarIntoView()
}

function closeStars(restoreFocus = false) {
    starsOpen.value = false
    if (restoreFocus) starsTrigger.value?.focus()
}

function selectStars(value: string) {
    updateFilters({ stars: value })
    closeStars(true)
}

function scrollActiveStarIntoView() {
    starsList.value?.children.item(activeStarIndex.value)?.scrollIntoView({ block: 'nearest' })
}

async function handleStarsKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
        event.preventDefault()
        closeStars(true)
        return
    }

    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        const option = starOptions[activeStarIndex.value]
        if (option) selectStars(option.value)
        return
    }

    switch (event.key) {
        case 'ArrowDown':
            activeStarIndex.value = (activeStarIndex.value + 1) % starOptions.length
            break
        case 'ArrowUp':
            activeStarIndex.value = (activeStarIndex.value - 1 + starOptions.length) % starOptions.length
            break
        case 'Home':
            activeStarIndex.value = 0
            break
        case 'End':
            activeStarIndex.value = starOptions.length - 1
            break
        default:
            return
    }
    event.preventDefault()
    await nextTick()
    scrollActiveStarIntoView()
}

function handleOutsidePointerdown(event: PointerEvent) {
    if (event.target instanceof Node && !starsDropdown.value?.contains(event.target)) {
        closeStars()
    }
}

function handleStarsFocusout(event: FocusEvent) {
    if (!(event.relatedTarget instanceof Node) || !starsDropdown.value?.contains(event.relatedTarget)) {
        closeStars()
    }
}

onMounted(() => {
    document.addEventListener('pointerdown', handleOutsidePointerdown)
})
onBeforeUnmount(() => document.removeEventListener('pointerdown', handleOutsidePointerdown))
</script>

<template>
    <div class="records-page">
        <section
            class="records-filter"
            aria-label="记录榜筛选"
        >
            <div class="records-filter__conditions">
                <div
                    class="records-filter__group"
                    role="group"
                    aria-label="记录榜排序"
                >
                    <button
                        v-for="option in sortOptions"
                        :key="option.value"
                        class="records-filter__option"
                        :class="{ 'is-active': filters.sort === option.value }"
                        type="button"
                        :aria-pressed="filters.sort === option.value"
                        @click="updateFilters({ sort: option.value })"
                    >
                        <span>{{ option.label }}</span>
                    </button>
                </div>

                <span
                    class="records-filter__divider"
                    aria-hidden="true"
                ></span>

                <div
                    class="records-filter__group"
                    role="group"
                    aria-label="赛道距离"
                >
                    <button
                        v-for="option in distanceOptions"
                        :key="option.value"
                        class="records-filter__option"
                        :class="{ 'is-active': filters.distance === option.value }"
                        type="button"
                        :aria-pressed="filters.distance === option.value"
                        @click="updateFilters({ distance: option.value })"
                    >
                        <span>{{ option.label }}</span>
                    </button>
                </div>

                <div
                    ref="starsDropdown"
                    class="records-filter__stars"
                    @focusout="handleStarsFocusout"
                >
                    <button
                        :id="`${starsId}-trigger`"
                        ref="starsTrigger"
                        class="records-filter__stars-trigger"
                        :class="{ 'is-open': starsOpen }"
                        type="button"
                        aria-haspopup="listbox"
                        :aria-expanded="starsOpen"
                        :aria-controls="starsOpen ? `${starsId}-list` : undefined"
                        @click="starsOpen ? closeStars() : openStars()"
                        @keydown.down.prevent="openStars"
                        @keydown.up.prevent="openStars"
                    >
                        <span class="records-filter__stars-label">
                            星级：<span>{{ filters.stars ? `${filters.stars} 星` : '全部' }}</span>
                        </span>
                        <Icon
                            class="records-filter__stars-arrow"
                            icon="ep:arrow-down"
                            aria-hidden="true"
                        />
                    </button>
                    <ul
                        v-if="starsOpen"
                        :id="`${starsId}-list`"
                        ref="starsList"
                        class="records-filter__stars-menu"
                        role="listbox"
                        aria-label="赛道星级"
                        :aria-activedescendant="`${starsId}-option-${activeStarIndex}`"
                        tabindex="-1"
                        @keydown="handleStarsKeydown"
                    >
                        <li
                            v-for="(option, index) in starOptions"
                            :id="`${starsId}-option-${index}`"
                            :key="option.value"
                            class="records-filter__stars-option"
                            :class="{
                                'is-selected': filters.stars === option.value,
                                'is-focused': activeStarIndex === index,
                            }"
                            role="option"
                            :aria-selected="filters.stars === option.value"
                            @mouseenter="activeStarIndex = index"
                            @mousedown.prevent
                            @click="selectStars(option.value)"
                        >
                            <span>{{ option.label }}</span>
                            <Icon
                                v-if="filters.stars === option.value"
                                icon="ep:check"
                                aria-hidden="true"
                            />
                        </li>
                    </ul>
                </div>
                <button v-if="hasFilters" class="records-filter__clear" type="button" @click="resetFilters">重置</button>
            </div>

            <label class="records-filter__search">
                <Icon
                    class="records-filter__search-icon"
                    icon="ep:search"
                    aria-hidden="true"
                />
                <input
                    v-model="keyword"
                    class="records-filter__search-input"
                    type="search"
                    maxlength="100"
                    placeholder="搜索赛道、车手或车队"
                    aria-label="搜索赛道、车手或车队"
                    @keydown.enter="applySearch"
                />
            </label>
        </section>

        <section class="records-list" aria-label="赛道记录榜单">
            <header class="records-list__header">
                <h2 class="records-list__title">赛道记录</h2>
                <p v-if="data" class="records-list__count" role="status">
                    <span>共</span>
                    <span class="records-list__count-value">{{ filteredRecords.length }}</span>
                    <span>张赛道</span>
                </p>
            </header>
            <div v-if="loading" class="records-list__empty" role="status">正在加载赛道记录…</div>
            <div v-else-if="error" class="records-list__empty">
                <p role="alert">{{ apiErrorMessage(error) }}</p>
                <button type="button" @click="retry">重新加载</button>
            </div>
            <ul v-else-if="filteredRecords.length" class="records-list__items">
                <li v-for="record in filteredRecords" :key="record.track.id">
                    <RecordCard :record="record" />
                </li>
            </ul>
            <div v-else-if="hasSearch" class="records-list__empty">
                <Icon icon="ep:search" aria-hidden="true" />
                <p>没有找到匹配的赛道</p>
                <button type="button" @click="resetFilters">重置筛选</button>
            </div>
            <div v-else class="records-list__empty" role="status">暂无公开赛道记录</div>
        </section>
    </div>
</template>

<style scoped lang="scss">
.records-page {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding-block: 32px;
    font-variant-numeric: lining-nums tabular-nums;

    .records-filter {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 28px;
        font-size: 16px;

        .records-filter__conditions {
            display: flex;
            flex: 0 0 auto;
            align-items: center;
            gap: 16px 24px;
            padding-inline: 8px;

            .records-filter__group {
                display: flex;
                gap: 12px;

                .records-filter__option {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 30px;
                    padding-inline: clamp(12px, 1.6vw, 16px);
                    border: 1px solid color-mix(in srgb, var(--tk-color-text-secondary) 55%, transparent);
                    color: var(--tk-color-text-secondary);
                    background: color-mix(in srgb, var(--tk-color-bg) 35%, transparent);
                    box-shadow: inset 0 0 0 2px var(--tk-color-bg);
                    cursor: pointer;
                    white-space: nowrap;
                    transform: skewX(-24deg);
                    transition: color 160ms ease, border-color 160ms ease, background 160ms ease;

                    &:hover {
                        border-color: var(--tk-color-primary);
                        color: var(--tk-color-primary);
                    }

                    &:focus-visible {
                        outline: 2px solid var(--tk-color-primary);
                        outline-offset: 3px;
                    }

                    &.is-active {
                        border-color: var(--tk-color-primary);
                        color: var(--tk-color-bg);
                        background: linear-gradient(
                            135deg,
                            color-mix(in srgb, var(--tk-color-primary) 70%, var(--tk-color-bg)),
                            var(--tk-color-primary)
                        );
                        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tk-color-text) 45%, transparent);
                        font-weight: 700;
                    }

                    span {
                        transform: skewX(24deg);
                    }
                }
            }

            .records-filter__divider {
                flex: 0 0 1px;
                width: 1px;
                height: 30px;
                background: color-mix(in srgb, var(--tk-color-text-secondary) 45%, transparent);
            }

            .records-filter__clear {
                padding: 5px;
                border: 0;
                color: var(--tk-color-primary);
                background: transparent;
                cursor: pointer;

                &:hover {
                    text-decoration: underline;
                }

                &:focus-visible {
                    outline: 2px solid var(--tk-color-primary);
                }
            }

            .records-filter__stars {
                position: relative;
                flex: 0 0 132px;
                width: 132px;

                .records-filter__stars-trigger {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                    height: 30px;
                    padding-inline: 17px 12px;
                    border: 1px solid color-mix(in srgb, var(--tk-color-text-secondary) 55%, transparent);
                    color: var(--tk-color-text-secondary);
                    background: color-mix(in srgb, var(--tk-color-bg) 35%, transparent);
                    box-shadow: inset 0 0 0 2px var(--tk-color-bg);
                    cursor: pointer;
                    transform: skewX(-24deg);

                    &:hover,
                    &.is-open {
                        border-color: var(--tk-color-primary);
                    }

                    &:focus-visible {
                        outline: 2px solid var(--tk-color-primary);
                        outline-offset: 3px;
                    }

                    .records-filter__stars-label {
                        white-space: nowrap;
                        transform: skewX(24deg);

                        span {
                            color: var(--tk-color-text);
                        }
                    }

                    .records-filter__stars-arrow {
                        width: 12px;
                        height: 12px;
                        transform: skewX(24deg);
                    }

                    &.is-open {
                        .records-filter__stars-arrow {
                            transform: skewX(24deg) rotate(180deg);
                        }
                    }
                }

                .records-filter__stars-menu {
                    position: absolute;
                    z-index: 10;
                    top: calc(100% + 10px);
                    inset-inline: 0;
                    max-height: min(320px, 60vh);
                    margin: 0;
                    padding: 5px;
                    overflow-y: auto;
                    border: 1px solid var(--tk-color-border);
                    outline: none;
                    background: var(--tk-color-bg);
                    box-shadow: 0 8px 24px color-mix(in srgb, var(--tk-color-bg) 65%, transparent);
                    list-style: none;

                    .records-filter__stars-option {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        min-height: 32px;
                        padding-inline: 12px;
                        color: var(--tk-color-text);
                        cursor: pointer;

                        &.is-focused {
                            background: color-mix(in srgb, var(--tk-color-primary) 12%, transparent);
                        }

                        &.is-selected {
                            color: var(--tk-color-primary);
                        }

                        svg {
                            width: 14px;
                            height: 14px;
                        }
                    }
                }
            }
        }

        .records-filter__search {
            display: flex;
            flex: 0 1 300px;
            align-items: center;
            gap: 10px;
            min-width: 240px;
            height: 40px;
            padding-inline: 14px;
            border: 1px solid color-mix(in srgb, var(--tk-color-text-secondary) 65%, transparent);
            border-radius: 2px;
            background: color-mix(in srgb, var(--tk-color-text-secondary) 7%, transparent);
            box-shadow: inset 0 0 0 2px var(--tk-color-bg);

            &:focus-within {
                border-color: var(--tk-color-primary);
                outline: 1px solid var(--tk-color-primary);
            }

            .records-filter__search-icon {
                flex: 0 0 20px;
                width: 20px;
                height: 20px;
                color: var(--tk-color-text);
            }

            .records-filter__search-input {
                width: 100%;
                min-width: 0;
                height: 100%;
                padding: 0;
                border: 0;
                outline: none;
                color: var(--tk-color-text);
                background: transparent;
                color-scheme: dark;

                &::placeholder {
                    color: var(--tk-color-text-secondary);
                    opacity: 0.7;
                }
            }
        }
    }

    .records-list {
        .records-list__header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 12px;
            color: var(--tk-color-text-secondary);
            font-size: 16px;
            line-height: 1.5;

            .records-list__title {
                margin: 0;
                color: var(--tk-color-text);
                font: inherit;
                font-size: 22px;
                font-weight: 700;
                line-height: 1.25;
            }

            .records-list__count {
                display: inline-flex;
                align-items: baseline;
                gap: 4px;
                margin: 0;
                line-height: 1;
                white-space: nowrap;

                .records-list__count-value {
                    font-weight: 600;
                }
            }
        }

        .records-list__items {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin: 0;
            padding: 0;
            list-style: none;

            li {
                min-width: 0;
            }
        }

        .records-list__empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 240px;
            border: 1px solid var(--tk-color-border);
            color: var(--tk-color-text-secondary);
            background: color-mix(in srgb, var(--tk-color-bg) 65%, transparent);

            button {
                padding: 6px 16px;
                border: 1px solid var(--tk-color-primary);
                color: var(--tk-color-primary);
                background: transparent;
                font-size: 13px;
                cursor: pointer;

                &:hover {
                    background: color-mix(in srgb, var(--tk-color-primary) 10%, transparent);
                }

                &:focus-visible {
                    outline: 2px solid var(--tk-color-primary);
                    outline-offset: 3px;
                }
            }

            svg {
                width: 30px;
                height: 30px;
            }

            p {
                margin-block: 16px;
                font-size: 14px;
            }
        }
    }

    @media (max-width: 1140px) {
        .records-filter {
            flex-wrap: wrap;
            gap: 20px;

            .records-filter__search {
                flex: 1 1 100%;
            }

            .records-filter__conditions {
                flex: 1;
                flex-wrap: wrap;

                .records-filter__group {
                    flex-wrap: wrap;
                }

                .records-filter__divider {
                    display: none;
                }
            }
        }
    }

    @media (max-width: 850px) {
        padding-block: 24px;
    }
}
</style>
