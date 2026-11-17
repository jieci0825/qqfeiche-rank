<script setup lang="ts">
import { computed, ref } from 'vue'
import { mockRankings, rankingCategories } from '@/data/rankings'
import type { RankingCategory, RankingItem } from '@/data/rankings'
import PodiumCard from './components/PodiumCard.vue'
import RankCard from './components/RankCard.vue'
import RankArtwork from './components/RankArtwork.vue'

const selectedCategory = ref<RankingCategory>('driver')
const currentCategory = computed(() => rankingCategories.find(category => category.value === selectedCategory.value) ?? rankingCategories[0])
const rankedItems = computed(() => [...mockRankings[selectedCategory.value]]
    .sort((left, right) => right.nationalRecordCount - left.nationalRecordCount)
    .map((item, index) => ({ item, rank: index + 1 })))
const podiumItems = computed(() => rankedItems.value.flatMap<{
    item: RankingItem
    rank: 1 | 2 | 3
}>(entry => {
    const { rank } = entry
    return rank === 1 || rank === 2 || rank === 3 ? [{ ...entry, rank }] : []
}))
const otherItems = computed(() => rankedItems.value.slice(3))
</script>

<template>
    <section class="rankings-page" aria-labelledby="rankings-title">
        <header class="rankings-page__header">
            <div class="rankings-page__heading">
                <h1 id="rankings-title">国服排行</h1>
                <RankArtwork class="rankings-page__title-brush" name="title-brush" eager />
            </div>
            <div class="rankings-page__categories" role="group" aria-label="排行分类">
                <button
                    v-for="category in rankingCategories"
                    :key="category.value"
                    class="rankings-page__category"
                    :class="{ 'is-active': selectedCategory === category.value }"
                    type="button"
                    :aria-pressed="selectedCategory === category.value"
                    @click="selectedCategory = category.value"
                >
                    <span>{{ category.label }}</span>
                </button>
            </div>
            <p class="rankings-page__count" aria-live="polite" aria-atomic="true">
                共 <span>{{ rankedItems.length }}</span> {{ currentCategory.unit }}{{ currentCategory.label }}
                <RankArtwork class="rankings-page__count-underline" name="count-underline" eager />
            </p>
        </header>

        <div v-if="rankedItems.length" class="rankings-page__leaderboard">
            <div class="rankings-page__podium" role="group" :aria-label="`前三名${currentCategory.label}`">
                <PodiumCard
                    v-for="entry in podiumItems"
                    :key="entry.item.id"
                    :item="entry.item"
                    :rank="entry.rank"
                />
            </div>

            <template v-if="otherItems.length">
                <RankArtwork class="rankings-page__divider" name="section-divider" eager />
                <ol class="rankings-page__list" start="4" :aria-label="`其余${currentCategory.label}排名`">
                    <li v-for="entry in otherItems" :key="entry.item.id">
                        <RankCard
                            :item="entry.item"
                            :rank="entry.rank"
                        />
                    </li>
                </ol>
            </template>
        </div>
        <p v-else class="rankings-page__empty">暂无{{ currentCategory.label }}排行</p>
    </section>
</template>

<style scoped lang="scss">
.rankings-page {
    padding-block: 30px 56px;
    font-variant-numeric: lining-nums tabular-nums;

    .rankings-page__header {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
        align-items: center;
        gap: 20px;

        .rankings-page__heading {
            position: relative;
            justify-self: start;

            h1 {
                position: relative;
                z-index: 1;
                margin: 0;
                color: var(--tk-color-text);
                font-size: 40px;
                font-weight: 500;
                letter-spacing: 4px;
                line-height: 1.2;
                white-space: nowrap;
            }

            .rankings-page__title-brush {
                position: absolute;
                bottom: -20px;
                left: -14px;
                width: 210px;
            }
        }

        .rankings-page__count {
            position: relative;
            justify-self: end;
            margin: 0;
            padding-inline: 4px;
            color: var(--tk-color-text-secondary);
            font-size: 20px;
            white-space: nowrap;

            span {
                font-family: var(--tk-font-family-numeric);
                font-size: 24px;
            }

            .rankings-page__count-underline {
                position: absolute;
                right: 0;
                bottom: -12px;
            }
        }

        .rankings-page__categories {
            display: flex;
            justify-self: center;
            gap: 8px;
            padding-inline: 8px;
            font-size: 16px;

            .rankings-page__category {
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
        }
    }

    .rankings-page__leaderboard {
        .rankings-page__podium {
            display: grid;
            grid-template-columns: 1fr 1.2fr 1fr;
            align-items: end;
            gap: 20px;
            margin: 120px 12px 26px;
        }

        .rankings-page__divider {
            margin-block: 0 22px;
        }

        .rankings-page__list {
            display: grid;
            // 按列表实际可用宽度换列，保证每张卡片有足够的内容空间。
            grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
            gap: 12px 16px;
            margin: 0;
            padding: 0;
            list-style: none;

            li {
                min-width: 0;
            }
        }
    }

    .rankings-page__empty {
        padding-block: 100px;
        color: var(--tk-color-text-secondary);
        font-size: 22px;
        text-align: center;
    }

    @media (max-width: 900px) {
        .rankings-page__leaderboard {
            .rankings-page__podium {
                gap: 14px;
                margin-inline: 4px;
            }
        }
    }

    @media (max-width: 760px) {
        .rankings-page__header {
            grid-template-columns: auto minmax(0, 1fr) auto;
            gap: 12px;

            .rankings-page__heading {
                h1 {
                    font-size: clamp(18px, 4vw, 28px);
                    letter-spacing: 1px;
                }

                .rankings-page__title-brush {
                    left: -6px;
                    width: calc(100% + 12px);
                }
            }

            .rankings-page__categories {
                width: min(100%, 272px);
                min-width: 0;
                gap: 6px;
                padding-inline: 6px;
                font-size: 14px;

                .rankings-page__category {
                    flex: 1;
                    width: auto;
                    min-width: 0;
                }
            }

            .rankings-page__count {
                padding: 0;
                font-size: 14px;

                span {
                    font-size: 18px;
                }
            }
        }

        .rankings-page__leaderboard {
            .rankings-page__podium {
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 70px 18px;
                margin-top: 110px;
            }
        }
    }

    @media (max-width: 640px) {
        .rankings-page__leaderboard {
            .rankings-page__podium {
                grid-template-columns: minmax(0, 1fr);
                gap: 80px;
                margin-inline: 10px;
            }
        }
    }

    @media (max-width: 480px) {
        padding-block: 24px 36px;

        .rankings-page__leaderboard {
            .rankings-page__podium {
                grid-template-columns: minmax(0, 1fr);
                gap: 74px;
                margin: 112px 10px 28px;
            }
        }
    }
}
</style>
