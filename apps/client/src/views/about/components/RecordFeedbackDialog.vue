<script setup lang="ts">
import { computed, reactive, ref, useId } from 'vue'
import { ElOption, ElSelect } from 'element-plus'
import type { SelectInstance } from 'element-plus'
import 'element-plus/es/components/select/style/index'
import { Icon } from '@/icons'
import { tracks } from '@/data/tracks'

type FeedbackType = 'update' | 'correction'
type FieldName = 'trackName' | 'videoUrl' | 'description'

const dialog = ref<HTMLDialogElement | null>(null)
const trackInput = ref<SelectInstance | null>(null)
const videoInput = ref<HTMLTextAreaElement | null>(null)
const descriptionInput = ref<HTMLTextAreaElement | null>(null)
const fieldId = useId()
const trackNames = [...new Set(tracks.map(track => track.name))]
const form = reactive({
    type: 'update' as FeedbackType,
    trackName: '',
    videoUrl: '',
    description: '',
})
const errors = reactive<Record<FieldName, string>>({
    trackName: '',
    videoUrl: '',
    description: '',
})
const submitMessage = ref('')
const isCorrection = computed(() => form.type === 'correction')

function open() {
    submitMessage.value = ''
    dialog.value?.showModal()
}

function close() {
    trackInput.value?.blur()
    dialog.value?.close()
}

function handleBackdropClick(event: MouseEvent) {
    if (event.target !== dialog.value || !dialog.value) return
    const bounds = dialog.value.getBoundingClientRect()
    if (event.clientX < bounds.left || event.clientX > bounds.right
        || event.clientY < bounds.top || event.clientY > bounds.bottom) {
        close()
    }
}

function validate() {
    form.trackName = form.trackName.trim()
    form.videoUrl = form.videoUrl.trim()
    form.description = form.description.trim()
    errors.trackName = trackNames.includes(form.trackName) ? '' : '请从赛道列表中选择一张赛道。'
    errors.videoUrl = form.videoUrl ? '' : '请提供视频链接或平台分享内容。'
    errors.description = isCorrection.value && !form.description ? '请说明需要修正的内容。' : ''

    if (errors.trackName) trackInput.value?.focus()
    else if (errors.videoUrl) videoInput.value?.focus()
    else if (errors.description) descriptionInput.value?.focus()

    return !Object.values(errors).some(Boolean)
}

function submit() {
    submitMessage.value = ''
    if (!validate()) return
    submitMessage.value = '提交功能暂未开放，填写的内容已保留，请稍后再试。'
}

defineExpose({ open })
</script>

<template>
    <div class="record-feedback">
        <dialog
            ref="dialog"
            class="record-feedback__dialog"
            :aria-labelledby="`${fieldId}-title`"
            @cancel.prevent="close"
            @click="handleBackdropClick"
        >
            <header class="record-feedback__header">
                <div>
                    <h2 :id="`${fieldId}-title`">提交信息</h2>
                </div>
                <button class="record-feedback__close" type="button" aria-label="关闭提交弹窗" @click="close">
                    <Icon icon="ep:close" aria-hidden="true" />
                </button>
            </header>

            <form class="record-feedback__form" novalidate @submit.prevent="submit" @input="submitMessage = ''">
                <fieldset class="record-feedback__types">
                    <legend>反馈类型 <span class="record-feedback__required">*</span></legend>
                    <div class="record-feedback__type-options">
                        <label class="record-feedback__type" :class="{ 'is-selected': form.type === 'update' }">
                            <input v-model="form.type" type="radio" :name="`${fieldId}-type`" value="update" @change="errors.description = ''" />
                            <span><strong>更新记录</strong><small>补充新产生的赛道记录</small></span>
                        </label>
                        <label class="record-feedback__type" :class="{ 'is-selected': isCorrection }">
                            <input v-model="form.type" type="radio" :name="`${fieldId}-type`" value="correction" />
                            <span><strong>修正记录</strong><small>更正已收录的记录信息</small></span>
                        </label>
                    </div>
                </fieldset>

                <div class="record-feedback__field">
                    <label :for="`${fieldId}-track`">对应赛道 <span class="record-feedback__required">*</span></label>
                    <ElSelect
                        :id="`${fieldId}-track`"
                        ref="trackInput"
                        v-model="form.trackName"
                        class="record-feedback__track-select"
                        :class="{ 'is-invalid': !!errors.trackName }"
                        name="trackName"
                        placeholder="输入或选择赛道，如 11城"
                        filterable
                        default-first-option
                        fit-input-width
                        :teleported="false"
                        :show-arrow="false"
                        popper-class="record-feedback__track-popper"
                        no-match-text="未找到对应赛道"
                        no-data-text="暂无赛道"
                        aria-label="对应赛道"
                        :aria-invalid="!!errors.trackName"
                        :aria-describedby="errors.trackName ? `${fieldId}-track-error` : undefined"
                        @change="errors.trackName = ''; submitMessage = ''"
                    >
                        <ElOption v-for="name in trackNames" :key="name" :label="name" :value="name" />
                    </ElSelect>
                    <p v-if="errors.trackName" :id="`${fieldId}-track-error`" class="record-feedback__error">{{ errors.trackName }}</p>
                </div>

                <div class="record-feedback__field">
                    <label :for="`${fieldId}-video`">视频链接或分享内容 <span class="record-feedback__required">*</span></label>
                    <textarea
                        :id="`${fieldId}-video`"
                        ref="videoInput"
                        v-model="form.videoUrl"
                        name="videoUrl"
                        placeholder="粘贴视频链接，或抖音等平台复制的完整分享内容"
                        rows="3"
                        autocomplete="off"
                        maxlength="4000"
                        required
                        :aria-invalid="!!errors.videoUrl"
                        :aria-describedby="`${fieldId}-video-hint${errors.videoUrl ? ` ${fieldId}-video-error` : ''}`"
                        @input="errors.videoUrl = ''"
                    ></textarea>
                    <p :id="`${fieldId}-video-hint`" class="record-feedback__hint">支持平台分享文案、口令及链接，可直接粘贴，无需单独提取网址。</p>
                    <p v-if="errors.videoUrl" :id="`${fieldId}-video-error`" class="record-feedback__error">{{ errors.videoUrl }}</p>
                </div>

                <div class="record-feedback__field">
                    <label :for="`${fieldId}-description`">
                        {{ isCorrection ? '修正说明' : '补充说明' }}
                        <span v-if="isCorrection" class="record-feedback__required">*</span>
                        <span v-else class="record-feedback__optional">（选填）</span>
                    </label>
                    <textarea
                        :id="`${fieldId}-description`"
                        ref="descriptionInput"
                        v-model="form.description"
                        name="description"
                        :placeholder="isCorrection ? '请说明哪项信息有误，以及应修正的内容。' : '可补充车手、成绩、记录日期等信息。'"
                        rows="3"
                        maxlength="500"
                        :required="isCorrection"
                        :aria-invalid="!!errors.description"
                        :aria-describedby="errors.description ? `${fieldId}-description-error` : undefined"
                        @input="errors.description = ''"
                    ></textarea>
                    <p v-if="errors.description" :id="`${fieldId}-description-error`" class="record-feedback__error">{{ errors.description }}</p>
                </div>

                <p v-if="submitMessage" class="record-feedback__message" role="alert">{{ submitMessage }}</p>
                <footer class="record-feedback__actions">
                    <button class="record-feedback__cancel" type="button" @click="close">取消</button>
                    <button class="record-feedback__submit" type="submit">提交信息 <Icon icon="ep:right" aria-hidden="true" /></button>
                </footer>
            </form>
        </dialog>
    </div>
</template>

<style scoped lang="scss">
.record-feedback {
    --tk-radius-feedback: 4px;

    .record-feedback__dialog {
        width: min(560px, calc(100vw - 32px));
        max-width: none;
        max-height: calc(100dvh - 40px);
        margin: auto;
        padding: 30px 32px 26px;
        overflow: auto;
        border: 1px solid var(--tk-color-border);
        border-radius: var(--tk-radius-feedback);
        color: var(--tk-color-text);
        background: color-mix(in srgb, var(--tk-color-bg) 96%, var(--tk-color-primary));
        box-shadow: 0 16px 64px color-mix(in srgb, var(--tk-color-bg) 70%, transparent);
        scrollbar-width: thin;
        scrollbar-color: var(--tk-color-scrollbar-thumb) transparent;
        color-scheme: dark;

        &::backdrop {
            background: color-mix(in srgb, var(--tk-color-bg) 75%, transparent);
            backdrop-filter: blur(4px);
        }

        button {
            border-radius: var(--tk-radius-feedback);
            cursor: pointer;

            &:focus-visible {
                outline: 2px solid var(--tk-color-primary);
                outline-offset: 4px;
            }
        }

        .record-feedback__header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 24px;

            h2 {
                margin: 0;
                font-size: 30px;
                font-weight: 400;
                letter-spacing: 4px;
            }

            .record-feedback__close {
                display: grid;
                flex-shrink: 0;
                place-items: center;
                width: 32px;
                height: 32px;
                padding: 0;
                border: 1px solid transparent;
                color: var(--tk-color-text-secondary);
                background: transparent;
                font-size: 20px;

                &:hover {
                    border-color: var(--tk-color-border);
                    color: var(--tk-color-primary);
                }
            }
        }

        .record-feedback__form {
            display: flex;
            flex-direction: column;
            gap: 22px;

            .record-feedback__required {
                margin-left: 3px;
                color: var(--tk-color-primary);
            }

            .record-feedback__types {
                min-width: 0;
                margin: 0;
                padding: 0;
                border: 0;

                legend {
                    margin-bottom: 11px;
                    padding: 0;
                    font-size: 16px;
                }

                .record-feedback__type-options {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 12px;

                    .record-feedback__type {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 13px 12px;
                        border: 1px solid var(--tk-color-border);
                        border-radius: var(--tk-radius-feedback);
                        cursor: pointer;

                        &.is-selected {
                            border-color: color-mix(in srgb, var(--tk-color-primary) 65%, transparent);
                            background: color-mix(in srgb, var(--tk-color-primary) 6%, transparent);
                        }

                        &:focus-within {
                            outline: 2px solid var(--tk-color-primary);
                            outline-offset: -2px;
                        }

                        input {
                            flex-shrink: 0;
                            width: 15px;
                            height: 15px;
                            margin: 0;
                            accent-color: var(--tk-color-primary);
                        }

                        strong {
                            display: block;
                            margin-bottom: 6px;
                            font-size: 16px;
                            font-weight: 400;
                            letter-spacing: 1px;
                        }

                        small {
                            display: block;
                            color: var(--tk-color-text-secondary);
                            font-size: 12px;
                            line-height: 1.5;
                        }
                    }
                }
            }

            .record-feedback__field {
                display: flex;
                flex-direction: column;
                gap: 9px;

                label {
                    font-size: 16px;
                }

                .record-feedback__optional {
                    color: var(--tk-color-text-secondary);
                    font-size: 12px;
                }

                > input,
                > textarea {
                    width: 100%;
                    min-height: 42px;
                    padding: 10px 12px;
                    border: 1px solid var(--tk-color-border);
                    border-radius: var(--tk-radius-feedback);
                    color: var(--tk-color-text);
                    background: var(--tk-color-bg);
                    font-size: 15px;
                    line-height: 1.6;

                    &::placeholder {
                        color: color-mix(in srgb, var(--tk-color-text-secondary) 60%, var(--tk-color-bg));
                    }

                    &:focus-visible {
                        border-color: var(--tk-color-primary);
                        outline: 1px solid var(--tk-color-primary);
                    }

                    &[aria-invalid='true'] {
                        border-color: var(--tk-color-record-accent);
                    }
                }

                textarea {
                    min-height: 88px;
                    resize: vertical;
                }

                .record-feedback__track-select {
                    --el-color-primary: var(--tk-color-primary);
                    --el-text-color-regular: var(--tk-color-text);
                    --el-text-color-placeholder: color-mix(in srgb, var(--tk-color-text-secondary) 60%, var(--tk-color-bg));
                    --el-border-color: var(--tk-color-border);
                    --el-border-color-hover: var(--tk-color-primary);
                    --el-border-color-light: var(--tk-color-border);
                    --el-fill-color-blank: var(--tk-color-bg);
                    --el-bg-color-overlay: color-mix(in srgb, var(--tk-color-bg) 96%, var(--tk-color-primary));
                    --el-fill-color-light: color-mix(in srgb, var(--tk-color-primary) 8%, transparent);
                    --el-border-radius-base: var(--tk-radius-feedback);

                    width: 100%;

                    :deep(.el-select__wrapper) {
                        min-height: 46px;
                        padding: 10px 12px;
                        font-size: 15px;
                    }

                    :deep(.el-select__input) {
                        font-family: inherit;
                        font-size: 15px;
                    }

                    &.is-invalid {
                        :deep(.el-select__wrapper) {
                            box-shadow: 0 0 0 1px var(--tk-color-record-accent) inset;
                        }
                    }

                    :deep(.record-feedback__track-popper) {
                        border: 1px solid var(--tk-color-border);
                        border-radius: var(--tk-radius-feedback);
                        color: var(--tk-color-text-secondary);
                        background: var(--el-bg-color-overlay);
                        box-shadow: 0 8px 24px color-mix(in srgb, var(--tk-color-bg) 60%, transparent);

                        .el-select-dropdown__wrap {
                            max-height: 200px;
                        }

                        .el-select-dropdown__list {
                            padding: 6px;
                        }

                        .el-select-dropdown__item {
                            height: 38px;
                            padding-inline: 12px;
                            border-radius: var(--tk-radius-feedback);
                            color: var(--tk-color-text-secondary);
                            font-size: 15px;
                            line-height: 38px;

                            &.is-hovering {
                                color: var(--tk-color-primary);
                                background: var(--el-fill-color-light);
                            }

                            &.is-selected {
                                color: var(--tk-color-primary);
                                background: var(--el-fill-color-light);
                                box-shadow: inset 2px 0 var(--tk-color-primary);
                                font-weight: 400;
                            }
                        }

                        .el-select-dropdown__empty {
                            color: var(--tk-color-text-secondary);
                            font-size: 14px;
                        }

                        .el-scrollbar__thumb {
                            background: var(--tk-color-scrollbar-thumb);
                        }
                    }
                }

                .record-feedback__hint,
                .record-feedback__error {
                    margin: 0;
                    font-size: 12px;
                    line-height: 1.7;
                }

                .record-feedback__hint {
                    color: var(--tk-color-text-secondary);
                }

                .record-feedback__error {
                    color: color-mix(in srgb, var(--tk-color-record-accent) 55%, var(--tk-color-text));
                }
            }

            .record-feedback__message {
                margin: 0;
                color: var(--tk-color-primary);
                font-size: 14px;
                line-height: 1.8;
            }

            .record-feedback__actions {
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                padding-top: 20px;
                border-top: 1px solid var(--tk-color-border);

                button {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    min-height: 40px;
                    padding: 9px 20px;
                    font-size: 15px;
                    letter-spacing: 2px;
                }

                .record-feedback__cancel {
                    border: 1px solid var(--tk-color-border);
                    color: var(--tk-color-text-secondary);
                    background: transparent;

                    &:hover {
                        border-color: var(--tk-color-text-secondary);
                        color: var(--tk-color-text);
                    }
                }

                .record-feedback__submit {
                    border: 1px solid var(--tk-color-primary);
                    color: var(--tk-color-bg);
                    background: var(--tk-color-primary);

                    &:hover {
                        background: var(--tk-color-text);
                    }
                }
            }
        }
    }

    @media (max-width: 480px) {
        .record-feedback__dialog {
            max-height: calc(100dvh - 24px);
            padding: 24px 20px 20px;

            .record-feedback__form {
                .record-feedback__types {
                    .record-feedback__type-options {
                        gap: 8px;

                        .record-feedback__type {
                            gap: 8px;
                            padding: 12px 8px;

                            small {
                                font-size: 11px;
                            }
                        }
                    }
                }
            }
        }
    }
}
</style>
