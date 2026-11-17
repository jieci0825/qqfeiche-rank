<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Icon } from '@/icons'
import RecordFeedbackDialog from './components/RecordFeedbackDialog.vue'

const feedbackDialog = ref<InstanceType<typeof RecordFeedbackDialog> | null>(null)
</script>

<template>
    <section class="about-page" aria-labelledby="about-title">
        <header class="about-page__header">
            <div class="about-page__heading">
                <h1 id="about-title">关于本站</h1>
            </div>
            <span class="about-page__volume">飞车手记<span aria-hidden="true"> / </span>卷首</span>
        </header>

        <div class="about-page__prologue">
            <aside class="about-page__inscription" aria-label="卷首题字">
                <p class="about-page__verse">以毫厘竞速<br />以热爱长行</p>
                <div class="about-page__inscription-footer">
                    <span class="about-page__small-seal">初心</span>
                    <p>记下每一次超越<br />也记得为何出发</p>
                </div>
            </aside>

            <article class="about-letter" aria-labelledby="letter-title">
                <header class="about-letter__header">
                    <h2 id="letter-title">车友，你好。</h2>
                    <p class="about-letter__salutation">欢迎来到本站，下面是榜单的排序与计时规则。</p>
                </header>

                <div class="about-letter__body">
                    <p>
                        记录排行按当前车手保持赛道记录的天数，由多到少排序；
                        国服排行则按持有的国服记录数量，由多到少排序。
                    </p>
                    <p>
                        记录保持天数的计算方式是：从最新一条录入的记录开始，按录入顺序向前回溯，
                        只要车手仍是当前车手，就继续往前查，直到遇到其他车手为止。
                        以这段连续记录中最早一条的日期为起点，计算至今的天数。
                        因此，车手刷新自己的记录会延续计时，被其他车手打破后再夺回，则重新起算。
                    </p>
                    <p>
                        例如，11 城先后录入了 5 次记录，车手按从旧到新的顺序分别为 a、b、c、a、a。
                        当前车手是 a，向前回溯到第 4 次仍是 a，第 3 次则是 c，
                        所以 a 的保持天数从第 4 次记录的日期开始计算。
                    </p>
                </div>

                <footer class="about-letter__signature">
                    <div>
                        <p>与诸位车友共勉</p>
                        <span>本站作者 敬上</span>
                    </div>
                    <span class="about-letter__seal" aria-label="热爱不息">热爱<br />不息</span>
                </footer>
            </article>
        </div>

        <section class="about-notes" aria-labelledby="reading-notes-title">
            <header class="about-notes__header">
                <span class="about-notes__label">附记</span>
                <h2 id="reading-notes-title">阅览小笺</h2>
            </header>
            <dl class="about-notes__list">
                <div class="about-notes__item">
                    <dt><span aria-hidden="true">一</span>此处所记</dt>
                    <dd>围绕 QQ 飞车手游，整理赛道记录与国服排行，方便同好查阅、交流与回望。</dd>
                </div>
                <div class="about-notes__item">
                    <dt><span aria-hidden="true">二</span>数据更新</dt>
                    <dd>本站数据由作者手动记录，会尽量及时更新，但并非实时数据，更新可能存在延迟。</dd>
                </div>
                <div class="about-notes__item">
                    <dt><span aria-hidden="true">三</span>记录反馈</dt>
                    <dd>如果发现记录有误，或有新纪录尚未及时更新，可点击左下角的提交入口反馈，作者会在后台查看并核对。</dd>
                </div>
            </dl>
        </section>

        <footer class="about-page__footer">
            <button class="about-page__submit" type="button" @click="feedbackDialog?.open()">
                <Icon icon="ep:edit-pen" aria-hidden="true" />
                提交信息
            </button>
            <RouterLink :to="{ name: 'records' }">
                重返赛道 <span aria-hidden="true">⟶</span>
            </RouterLink>
        </footer>
        <RecordFeedbackDialog ref="feedbackDialog" />
    </section>
</template>

<style scoped lang="scss">
.about-page {
    --about-text-muted: color-mix(in srgb, var(--tk-color-text-secondary) 78%, var(--tk-color-bg));
    --about-rule: color-mix(in srgb, var(--tk-color-text-secondary) 20%, transparent);

    max-width: 1060px;
    margin-inline: auto;
    padding-block: 38px 32px;
    color: var(--tk-color-text);

    .about-page__header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 24px;
        padding-bottom: 24px;
        border-bottom: 1px solid var(--about-rule);

        .about-page__heading {
            h1 {
                margin: 0;
                font-size: 34px;
                font-weight: 500;
                letter-spacing: 6px;
                line-height: 1.3;
            }
        }

        .about-page__volume {
            padding-bottom: 3px;
            color: var(--about-text-muted);
            font-size: 13px;
            letter-spacing: 3px;
            white-space: nowrap;

            span {
                margin-inline: 8px;
                color: var(--tk-color-record-accent);
            }
        }
    }

    .about-page__prologue {
        display: grid;
        grid-template-columns: 240px minmax(0, 1fr);
        gap: 70px;
        padding-block: 27px 46px;

        .about-page__inscription {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 28px 34px 0 0;

            &::after {
                position: absolute;
                top: 18px;
                right: 0;
                bottom: 18px;
                width: 1px;
                background: linear-gradient(to bottom, transparent, var(--about-rule) 18%, var(--about-rule) 75%, transparent);
                content: '';
            }

            .about-page__verse {
                margin: 0;
                color: var(--tk-color-primary);
                font-size: 36px;
                font-weight: 400;
                letter-spacing: 12px;
                line-height: 1.9;
                writing-mode: vertical-rl;
            }

            .about-page__inscription-footer {
                display: flex;
                align-items: center;
                gap: 16px;
                margin-top: 34px;

                .about-page__small-seal {
                    padding: 5px 3px 3px;
                    border: 1px solid var(--tk-color-record-accent);
                    color: var(--tk-color-record-accent);
                    font-size: 16px;
                    letter-spacing: 3px;
                    writing-mode: vertical-rl;
                }

                p {
                    margin: 0;
                    color: var(--about-text-muted);
                    font-size: 12px;
                    letter-spacing: 2px;
                    line-height: 2;
                }
            }
        }

        .about-letter {
            min-width: 0;
            text-shadow: 0 1px 4px var(--tk-color-bg);

            .about-letter__header {
                h2 {
                    margin: 0;
                    font-size: 42px;
                    font-weight: 400;
                    letter-spacing: 5px;
                    line-height: 1.4;
                }

                .about-letter__salutation {
                    margin: 26px 0 22px;
                    font-size: 18px;
                    letter-spacing: 1px;
                    line-height: 1.8;
                }
            }

            .about-letter__body {
                color: var(--tk-color-text-secondary);
                font-size: 17px;
                letter-spacing: 0.5px;
                line-height: 2.1;
                overflow-wrap: anywhere;

                > p {
                    margin: 0 0 18px;
                    text-align: justify;
                }
            }

            .about-letter__signature {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 18px;
                margin-top: 30px;
                text-align: right;

                p {
                    margin: 0 0 9px;
                    color: var(--about-text-muted);
                    font-size: 12px;
                    letter-spacing: 2px;
                }

                span {
                    font-size: 17px;
                    letter-spacing: 2px;
                }

                .about-letter__seal {
                    padding: 5px 5px 4px 7px;
                    border: 2px solid var(--tk-color-record-accent);
                    outline: 1px solid var(--tk-color-record-accent);
                    outline-offset: -5px;
                    color: var(--tk-color-record-accent);
                    font-size: 17px;
                    font-weight: 700;
                    line-height: 1.25;
                    text-align: center;
                    text-shadow: none;
                    transform: rotate(-4deg);
                }
            }
        }
    }

    .about-notes {
        padding-block: 30px 34px;
        border-top: 1px solid var(--about-rule);
        border-bottom: 1px solid var(--about-rule);

        .about-notes__header {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-bottom: 26px;

            .about-notes__label {
                padding: 3px 4px 3px 6px;
                border: 1px solid var(--tk-color-record-accent);
                color: var(--tk-color-record-accent);
                font-size: 11px;
                letter-spacing: 2px;
            }

            h2 {
                margin: 0;
                font-size: 21px;
                font-weight: 400;
                letter-spacing: 3px;
            }
        }

        .about-notes__list {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 32px;
            margin: 0;

            .about-notes__item {
                dt {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 12px;
                    font-size: 16px;
                    letter-spacing: 2px;

                    span {
                        color: var(--about-text-muted);
                        font-size: 12px;
                    }
                }

                dd {
                    margin: 0;
                    color: var(--about-text-muted);
                    font-size: 14px;
                    letter-spacing: 0.5px;
                    line-height: 1.95;
                    overflow-wrap: anywhere;
                }
            }
        }
    }

    .about-page__footer {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding-top: 23px;
        font-size: 13px;
        letter-spacing: 2px;

        .about-page__submit,
        a {
            display: inline-flex;
            align-items: center;
            gap: 14px;
            padding: 4px 0;
            border: 0;
            border-bottom: 1px solid transparent;
            color: var(--tk-color-primary);
            background: transparent;
            font: inherit;
            letter-spacing: inherit;
            text-decoration: none;
            cursor: pointer;

            &:hover {
                border-color: var(--tk-color-primary);
            }

            &:focus-visible {
                outline: 2px solid var(--tk-color-primary);
                outline-offset: 5px;
            }
        }
    }

    @media (max-width: 1000px) {
        .about-page__prologue {
            grid-template-columns: 190px minmax(0, 1fr);
            gap: 40px;

            .about-page__inscription {
                padding-right: 24px;

                .about-page__verse {
                    font-size: 32px;
                }

                .about-page__inscription-footer {
                    gap: 10px;

                    p {
                        letter-spacing: 1px;
                    }
                }
            }
        }
    }

    @media (max-width: 720px) {
        max-width: 600px;
        padding-top: 28px;

        .about-page__header {
            .about-page__volume {
                font-size: 11px;
                letter-spacing: 1px;

                span {
                    margin-inline: 4px;
                }
            }
        }

        .about-page__prologue {
            grid-template-columns: minmax(0, 1fr);
            gap: 0;
            padding-block: 17px 34px;

            .about-page__inscription {
                display: none;
            }

            .about-letter {
                .about-letter__header {
                    h2 {
                        font-size: 36px;
                    }
                }
            }
        }

        .about-notes {
            .about-notes__list {
                grid-template-columns: minmax(0, 1fr);
                gap: 24px;

                .about-notes__item {
                    dt {
                        margin-bottom: 6px;
                    }
                }
            }
        }
    }

    @media (max-width: 480px) {
        padding-inline: 8px;

        .about-page__header {
            gap: 12px;

            .about-page__heading {
                h1 {
                    font-size: 30px;
                    letter-spacing: 4px;
                }
            }
        }

        .about-page__prologue {
            .about-letter {
                .about-letter__header {
                    .about-letter__salutation {
                        font-size: 17px;
                    }
                }

                .about-letter__body {
                    font-size: 16px;
                    letter-spacing: 0;
                }
            }
        }
    }
}
</style>
