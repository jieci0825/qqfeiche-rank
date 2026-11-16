<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, useId } from 'vue'
import { Icon } from '@/icons'

type RecordMode = 'all' | 'ranked' | 'pinnacle'
type TrackLength = 'short' | 'medium' | 'long'

const modeOptions: { label: string; value: RecordMode }[] = [
    { label: '全部', value: 'all' },
    { label: '排位', value: 'ranked' },
    { label: '巅峰', value: 'pinnacle' },
]
const lengthOptions: { label: string; value: TrackLength }[] = [
    { label: '短图', value: 'short' },
    { label: '中图', value: 'medium' },
    { label: '长图', value: 'long' },
]
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

const filters = reactive({
    mode: 'all' as RecordMode,
    length: '' as TrackLength | '',
    stars: '',
    keyword: '',
})

function toggleLength(length: TrackLength) {
    filters.length = filters.length === length ? '' : length
}

async function openStars() {
    activeStarIndex.value = starOptions.findIndex(option => option.value === filters.stars)
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
    filters.stars = value
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

onMounted(() => document.addEventListener('pointerdown', handleOutsidePointerdown))
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
                    aria-label="记录类型"
                >
                    <button
                        v-for="option in modeOptions"
                        :key="option.value"
                        class="records-filter__option"
                        :class="{ 'is-active': filters.mode === option.value }"
                        type="button"
                        :aria-pressed="filters.mode === option.value"
                        @click="filters.mode = option.value"
                    >
                        <span>{{ option.label }}</span>
                    </button>
                </div>

                <span
                    class="records-filter__divider"
                    aria-hidden="true"
                ></span>

                <div
                    class="records-filter__group records-filter__group--length"
                    role="group"
                    aria-label="赛道长度"
                >
                    <button
                        v-for="option in lengthOptions"
                        :key="option.value"
                        class="records-filter__option"
                        :class="{ 'is-active': filters.length === option.value }"
                        type="button"
                        :aria-pressed="filters.length === option.value"
                        @click="toggleLength(option.value)"
                    >
                        <span>{{ option.label }}</span>
                    </button>
                </div>

                <span
                    class="records-filter__divider"
                    aria-hidden="true"
                ></span>

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
            </div>

            <label class="records-filter__search">
                <Icon
                    class="records-filter__search-icon"
                    icon="ep:search"
                    aria-hidden="true"
                />
                <input
                    v-model="filters.keyword"
                    class="records-filter__search-input"
                    type="search"
                    placeholder="搜索赛道、车手或车队"
                    aria-label="搜索赛道、车手或车队"
                />
            </label>
        </section>
    </div>
</template>

<style scoped lang="scss">
.records-page {
    padding-block: 32px;

    .records-filter {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 28px;
        font-family: var(--tk-font-display);
        font-size: 16px;

        .records-filter__conditions {
            display: flex;
            flex: 0 0 auto;
            align-items: center;
            gap: 32px;
            padding-inline: 8px;

            .records-filter__group {
                display: flex;
                gap: 8px;

                .records-filter__option {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 80px;
                    height: 30px;
                    padding: 0;
                    border: 1px solid color-mix(in srgb, var(--tk-color-text-secondary) 55%, transparent);
                    color: var(--tk-color-text-secondary);
                    background: color-mix(in srgb, var(--tk-color-bg) 35%, transparent);
                    box-shadow: inset 0 0 0 2px var(--tk-color-bg);
                    font: inherit;
                    cursor: pointer;
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

                &.records-filter__group--length {
                    .records-filter__option {
                        width: 64px;
                    }
                }
            }

            .records-filter__divider {
                flex: 0 0 1px;
                width: 1px;
                height: 30px;
                background: color-mix(in srgb, var(--tk-color-text-secondary) 45%, transparent);
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
                    font: inherit;
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
                font: inherit;
                color-scheme: dark;

                &::placeholder {
                    color: var(--tk-color-text-secondary);
                    opacity: 0.7;
                }
            }
        }
    }

    @media (max-width: 1050px) {
        .records-filter {
            flex-wrap: wrap;
            gap: 20px;

            .records-filter__search {
                flex: 1 1 100%;
            }
        }
    }

    @media (max-width: 800px) {
        padding-block: 24px;

        .records-filter {
            .records-filter__conditions {
                flex: 1;
                flex-wrap: wrap;
                gap: 16px 24px;

                .records-filter__divider {
                    display: none;
                }
            }
        }
    }
}
</style>
