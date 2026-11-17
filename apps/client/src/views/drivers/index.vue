<script setup lang="ts">
import { computed } from 'vue'
import { mockRankedDrivers } from '@/data/drivers'
import type { RankedDriver } from '@/data/drivers'
import DriverPodiumCard from './components/DriverPodiumCard.vue'
import DriverRankCard from './components/DriverRankCard.vue'
import RankArtwork from './components/RankArtwork.vue'

const rankedDrivers = computed(() => [...mockRankedDrivers]
    .sort((left, right) => right.nationalRecordCount - left.nationalRecordCount)
    .map((driver, index) => ({ driver, rank: index + 1 })))
const podiumDrivers = computed(() => rankedDrivers.value.flatMap<{
    driver: RankedDriver
    rank: 1 | 2 | 3
}>(entry => {
    const { rank } = entry
    return rank === 1 || rank === 2 || rank === 3 ? [{ ...entry, rank }] : []
}))
const otherDrivers = computed(() => rankedDrivers.value.slice(3))
</script>

<template>
    <section class="drivers-page" aria-labelledby="drivers-title">
        <header class="drivers-page__header">
            <div class="drivers-page__heading">
                <h1 id="drivers-title">车手排行</h1>
                <RankArtwork class="drivers-page__title-brush" name="title-brush" eager />
            </div>
            <p class="drivers-page__count">
                共 <span>{{ rankedDrivers.length }}</span> 位车手
                <RankArtwork class="drivers-page__count-underline" name="count-underline" eager />
            </p>
        </header>

        <div v-if="rankedDrivers.length" class="drivers-page__leaderboard">
            <div class="drivers-page__podium" role="group" aria-label="前三名车手">
                <DriverPodiumCard
                    v-for="entry in podiumDrivers"
                    :key="entry.driver.id"
                    :driver="entry.driver"
                    :rank="entry.rank"
                />
            </div>

            <template v-if="otherDrivers.length">
                <RankArtwork class="drivers-page__divider" name="section-divider" eager />
                <ol class="drivers-page__list" start="4" aria-label="其余车手排名">
                    <li v-for="entry in otherDrivers" :key="entry.driver.id">
                        <DriverRankCard
                            :driver="entry.driver"
                            :rank="entry.rank"
                        />
                    </li>
                </ol>
            </template>
        </div>
        <p v-else class="drivers-page__empty">暂无车手排行</p>
    </section>
</template>

<style scoped lang="scss">
.drivers-page {
    padding-block: 30px 56px;
    font-variant-numeric: lining-nums tabular-nums;

    .drivers-page__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;

        .drivers-page__heading {
            position: relative;
            padding-bottom: 12px;

            h1 {
                position: relative;
                z-index: 1;
                margin: 0;
                color: var(--tk-color-text);
                font-size: 40px;
                font-weight: 500;
                letter-spacing: 4px;
                line-height: 1.2;
            }

            .drivers-page__title-brush {
                position: absolute;
                bottom: -8px;
                left: -14px;
                width: 210px;
            }
        }

        .drivers-page__count {
            position: relative;
            margin: 0;
            padding: 0 4px 12px 32px;
            color: var(--tk-color-text-secondary);
            font-size: 20px;
            white-space: nowrap;

            span {
                font-family: var(--tk-font-family-numeric);
                font-size: 24px;
            }

            .drivers-page__count-underline {
                position: absolute;
                right: 0;
                bottom: 0;
            }
        }
    }

    .drivers-page__leaderboard {
        .drivers-page__podium {
            display: grid;
            grid-template-columns: 1fr 1.2fr 1fr;
            align-items: end;
            gap: 20px;
            margin: 80px 12px 26px;
        }

        .drivers-page__divider {
            margin-block: 0 22px;
        }

        .drivers-page__list {
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

    .drivers-page__empty {
        padding-block: 100px;
        color: var(--tk-color-text-secondary);
        font-size: 22px;
        text-align: center;
    }

    @media (max-width: 900px) {
        .drivers-page__leaderboard {
            .drivers-page__podium {
                gap: 14px;
                margin-inline: 4px;
            }
        }
    }

    @media (max-width: 760px) {
        .drivers-page__leaderboard {
            .drivers-page__podium {
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 70px 18px;
                margin-top: 74px;
            }
        }
    }

    @media (max-width: 640px) {
        .drivers-page__leaderboard {
            .drivers-page__podium {
                grid-template-columns: minmax(0, 1fr);
                gap: 80px;
                margin-inline: 10px;
            }
        }
    }

    @media (max-width: 480px) {
        padding-block: 24px 36px;

        .drivers-page__header {
            .drivers-page__heading {
                h1 {
                    font-size: 30px;
                    letter-spacing: 2px;
                }

                .drivers-page__title-brush {
                    width: 158px;
                }
            }

            .drivers-page__count {
                padding-left: 12px;
                font-size: 16px;
            }
        }

        .drivers-page__leaderboard {
            .drivers-page__podium {
                grid-template-columns: minmax(0, 1fr);
                gap: 74px;
                margin: 76px 10px 28px;
            }
        }
    }
}
</style>
