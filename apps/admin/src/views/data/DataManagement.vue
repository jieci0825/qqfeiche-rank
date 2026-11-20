<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, shallowRef, useId } from 'vue'
import { ElMessage, ElMessageBox, ElSwitch } from 'element-plus'
import {
    ApiError, apiErrorMessage, archiveDataItem, listDataItems, listDriverTeamOptions, saveDataItem, uploadDataImage,
    type DataInput, type DataItem, type DataResource, type DataStatus,
} from '@/api'
import defaultCarUrl from '@/assets/data/default-car.png'
import defaultDriverUrl from '@/assets/data/default-driver.svg?url'
import defaultPetUrl from '@/assets/data/default-pet.png'
import { Icon } from '@/icons'
import { useAuthStore } from '@/stores/auth'
import ManagementDialog from '../access/ManagementDialog.vue'
import ManagementTable from '../access/ManagementTable.vue'
import { useManagementList } from '../access/use-management-list'
import DataImageField from './DataImageField.vue'

const { resource } = defineProps<{ resource: DataResource }>()
const resources: Record<DataResource, { label: string; image?: { label: string; fallbackUrl: string } }> = {
    teams: { label: '车队' },
    drivers: { label: '车手', image: { label: '车手头像', fallbackUrl: defaultDriverUrl } },
    cars: { label: '赛车', image: { label: '赛车预览图', fallbackUrl: defaultCarUrl } },
    pets: { label: '宠物', image: { label: '宠物预览图', fallbackUrl: defaultPetUrl } },
}
const label = computed(() => resources[resource].label)
const image = computed(() => resources[resource].image)
const statusLabels: Record<DataStatus, string> = { active: '已启用', disabled: '已禁用', archived: '已归档' }
const search = ref('')
const status = ref<DataStatus | 'all'>('all')
const auth = useAuthStore()
const canCreate = computed(() => auth.can(`${resource}:create`))
const canUpdate = computed(() => auth.can(`${resource}:update`))
const canArchive = computed(() => auth.can(`${resource}:archive`))

const { items, loading, error: listError, load } = useManagementList(async signal => (await listDataItems(resource, signal)).items)
const visibleItems = computed(() => {
    const keyword = search.value.trim().toLowerCase()
    return items.value.filter(item => (status.value === 'all' || item.status === status.value) &&
        item.name.toLowerCase().includes(keyword))
})

const editorOpen = ref(false)
const editing = shallowRef<DataItem>()
const form = reactive<{ name: string; status: DataStatus; teamId: number | null; ecu: { id: string; name: string }[] }>({
    name: '', status: 'active', teamId: null, ecu: [],
})
const nameId = useId()
const teamFieldId = useId()
const ecuId = useId()
let nextEcuId = 0
const saving = ref(false)
const saveError = ref('')
const imageFile = shallowRef<File | null>(null)
const imageError = ref('')
const uploading = ref(false)
let uploadedImage: { file: File; ticket: string } | undefined
let saveRequest: AbortController | undefined
const archivingId = ref<number>()
const busy = computed(() => saving.value || archivingId.value !== undefined)

const {
    items: activeTeams, loading: loadingTeams, error: teamError, hasLoaded: teamsLoaded, load: loadTeams,
} = useManagementList(async signal => (await listDriverTeamOptions(signal)).teams, false)

const teamChoices = computed(() => {
    const choices = activeTeams.value.map(team => ({ ...team, disabled: false }))
    const current = editing.value
    if (current?.teamId != null && current.teamName && !choices.some(team => team.id === current.teamId)) {
        const statusLabel = current.teamStatus === 'disabled' || current.teamStatus === 'archived'
            ? statusLabels[current.teamStatus]
            : teamsLoaded.value ? '不可选' : ''
        choices.unshift({
            id: current.teamId,
            name: statusLabel ? `${current.teamName}（${statusLabel}）` : current.teamName,
            disabled: true,
        })
    }
    return choices
})

function clearImage() {
    imageFile.value = null
    imageError.value = ''
    uploadedImage = undefined
}

function createEcuField(name: string) {
    return { id: `${ecuId}-${nextEcuId++}`, name }
}

async function addEcu() {
    const field = createEcuField('')
    form.ecu.push(field)
    await nextTick()
    document.getElementById(field.id)?.focus()
}

async function removeEcu(index: number) {
    form.ecu.splice(index, 1)
    const nextField = form.ecu[index] ?? form.ecu[index - 1]
    await nextTick()
    if (nextField) document.getElementById(nextField.id)?.focus()
}

function openEditor(item?: DataItem) {
    clearImage()
    editing.value = item
    form.name = item?.name ?? ''
    form.status = item?.status ?? 'active'
    form.teamId = item?.teamId ?? null
    if (resource === 'cars') form.ecu = (item?.ecu?.length ? item.ecu : ['']).map(createEcuField)
    saveError.value = ''
    editorOpen.value = true
    if (resource === 'drivers') void loadTeams()
}

async function submit() {
    if (busy.value || imageError.value) return
    const name = form.name.trim()
    const selected = imageFile.value
    const imageLabel = image.value?.label
    const item = editing.value
    if (!name) {
        saveError.value = `请输入${label.value}名称`
        return
    }
    const input: DataInput = { name }
    if (form.status !== 'archived' && form.status !== item?.status) input.status = form.status
    if (resource === 'drivers' && form.teamId !== (item?.teamId ?? null)) input.teamId = form.teamId
    if (resource === 'cars') {
        const ecu = form.ecu.map(field => field.name.trim())
        if (!ecu.length || ecu.some(name => !name || name.length > 100)) {
            saveError.value = '每项 ECU 名称须为 1 至 100 字'
            return
        }
        input.ecu = ecu
    }

    const request = new AbortController()
    saveRequest = request
    saving.value = true
    saveError.value = ''
    try {
        if (resource !== 'teams' && imageLabel && selected) {
            if (uploadedImage?.file !== selected) {
                uploading.value = true
                const ticket = await uploadDataImage(resource, imageLabel, selected, request.signal)
                request.signal.throwIfAborted()
                uploadedImage = { file: selected, ticket }
                uploading.value = false
            }
            input.imageUploadTicket = uploadedImage.ticket
        }
        await saveDataItem(resource, input, item?.id, request.signal)
        request.signal.throwIfAborted()
        editorOpen.value = false
        ElMessage.success(`${label.value}已保存`)
        await load()
    } catch (error) {
        if (request.signal.aborted) return
        if (error instanceof ApiError) {
            if (['INVALID_UPLOAD_TICKET', 'UPLOAD_EXPIRED', 'UPLOAD_NOT_FOUND'].includes(error.code)) uploadedImage = undefined
            if (error.code === 'TEAM_UNAVAILABLE') void loadTeams()
        }
        saveError.value = apiErrorMessage(error)
    } finally {
        saveRequest = undefined
        uploading.value = false
        saving.value = false
    }
}

async function confirmArchive(item: DataItem) {
    if (busy.value) return
    archivingId.value = item.id
    try {
        await ElMessageBox.confirm(`归档「${item.name}」？归档后会保留资料及已有引用。`, `归档${label.value}`, {
            type: 'warning',
            confirmButtonText: '确认归档',
            cancelButtonText: '取消',
        })
        await archiveDataItem(resource, item.id)
        ElMessage.success(`${label.value}已归档`)
        await load()
    } catch (error) {
        if (error !== 'cancel' && error !== 'close') ElMessage.error(apiErrorMessage(error))
    } finally {
        archivingId.value = undefined
    }
}

onBeforeUnmount(() => saveRequest?.abort())
</script>

<template>
    <ManagementTable class="data-management" :error="listError">
        <template #search>
            <el-input v-model="search" :aria-label="`搜索${label}名称`" :placeholder="`搜索${label}名称`" clearable>
                <template #prefix>
                    <Icon icon="ep:search" aria-hidden="true" />
                </template>
            </el-input>
            <el-select v-model="status" :aria-label="`筛选${label}状态`">
                <el-option label="全部状态" value="all" />
                <el-option v-for="(text, value) in statusLabels" :key="value" :label="text" :value="value" />
            </el-select>
        </template>
        <template v-if="canCreate" #actions>
            <el-button type="primary" :disabled="busy" @click="openEditor()">
                <template #icon>
                    <Icon icon="ep:plus" aria-hidden="true" />
                </template>
                新增{{ label }}
            </el-button>
        </template>
        <template #error>
            <div class="data-management__load-error">
                <p role="alert">{{ listError }}</p>
                <el-button @click="load">重试</el-button>
            </div>
        </template>

        <div v-loading="loading" class="data-management__results" :aria-busy="loading">
            <div class="data-management__scroll" role="region" :aria-label="`${label}结果`" tabindex="0">
                <ul v-if="visibleItems.length" class="data-management__grid" role="list" :aria-label="`${label}列表`">
                    <li v-for="item in visibleItems" :key="item.id" class="data-management__card">
                        <div class="data-management__summary" :class="{ 'data-management__summary--avatar': resource === 'drivers' }">
                            <div v-if="image" class="data-management__media">
                                <el-image class="data-management__image" :src="item.imageUrl || image.fallbackUrl"
                                    :alt="item.imageUrl ? `${item.name}的${image.label}` : ''" fit="cover" loading="lazy">
                                    <template v-if="item.imageUrl" #error>
                                        <el-image class="data-management__image" :src="image.fallbackUrl" alt="" fit="cover" />
                                    </template>
                                </el-image>
                            </div>
                            <div class="data-management__identity">
                                <h2 class="data-management__name">{{ item.name }}</h2>
                                <p class="data-management__status" :class="{ 'is-active': item.status === 'active' }">
                                    {{ statusLabels[item.status] }}
                                </p>
                            </div>
                        </div>
                        <div v-if="resource === 'drivers' || resource === 'cars' || canUpdate || (canArchive && item.status !== 'archived')"
                            class="data-management__footer">
                            <span v-if="resource === 'drivers'" class="data-management__detail">{{ item.teamName ?? '未加入车队' }}</span>
                            <div v-else-if="resource === 'cars' && item.ecu?.[0]" class="data-management__ecu">
                                <span class="data-management__ecu-name" :title="item.ecu[0]">{{ item.ecu[0] }}</span>
                            </div>
                            <div v-if="canUpdate || (canArchive && item.status !== 'archived')" class="data-management__actions">
                                <el-button v-if="canUpdate" size="small" plain :aria-label="`编辑${label} ${item.name}`"
                                    :disabled="busy" @click="openEditor(item)">编辑</el-button>
                                <el-button v-if="canArchive && item.status !== 'archived'" size="small" type="danger"
                                    :aria-label="`归档${label} ${item.name}`" :loading="archivingId === item.id"
                                    :disabled="busy" @click="confirmArchive(item)">归档</el-button>
                            </div>
                        </div>
                    </li>
                </ul>
                <p v-else-if="!loading && !listError" class="data-management__empty" role="status">
                    {{ search.trim() || status !== 'all' ? `没有匹配的${label}` : `暂无${label}` }}
                </p>
            </div>
        </div>
    </ManagementTable>

    <ManagementDialog v-model="editorOpen" :title="`${editing ? '编辑' : '新增'}${label}`"
        :saving="saving" :error="saveError" :submit-disabled="Boolean(imageError)" @submit="submit" @closed="clearImage">
        <el-form-item :label="`${label}名称`" :for="nameId" required>
            <el-input :id="nameId" v-model="form.name" maxlength="100" aria-required="true" />
        </el-form-item>
        <el-form-item v-if="resource === 'drivers'" label="所属车队（选填）" :for="teamFieldId">
            <el-select :id="teamFieldId" v-model="form.teamId" filterable clearable :value-on-clear="() => null"
                :loading="loadingTeams" :disabled="loadingTeams" placeholder="搜索或选择车队" no-data-text="暂无可选车队">
                <el-option v-for="team in teamChoices" :key="team.id" :label="team.name" :value="team.id" :disabled="team.disabled" />
            </el-select>
            <div v-if="teamError" role="alert">
                {{ teamError }}
                <el-button link type="primary" @click="loadTeams">重新加载车队</el-button>
            </div>
        </el-form-item>
        <el-form-item v-if="resource === 'cars'" class="data-management__ecu-editor" label="ECU"
            :for="form.ecu[0]?.id" required>
            <div class="data-management__ecu-fields">
                <div v-for="(field, index) in form.ecu" :key="field.id" class="data-management__ecu-field">
                    <el-input :id="field.id" v-model="field.name" maxlength="100"
                        :aria-label="`第 ${index + 1} 项 ECU`" aria-required="true" />
                    <el-button v-if="form.ecu.length > 1" :aria-label="`移除第 ${index + 1} 项 ECU`"
                        @click="removeEcu(index)">移除</el-button>
                </div>
                <el-button plain @click="addEcu">添加 ECU</el-button>
            </div>
        </el-form-item>
        <el-form-item v-if="image" :label="`${image.label}（选填）`">
            <DataImageField v-model="imageFile" v-model:error="imageError" :label="image.label"
                :existing-url="editing?.imageUrl" :fallback-url="image.fallbackUrl" :disabled="saving" />
            <span v-if="uploading" role="status">正在上传{{ image.label }}…</span>
        </el-form-item>
        <el-form-item :label="`${label}状态`">
            <ElSwitch v-if="form.status !== 'archived'" v-model="form.status" :aria-label="`启用${label}`"
                active-value="active" inactive-value="disabled" active-text="启用" inactive-text="禁用"
                inline-prompt :width="56" />
            <span v-else>{{ statusLabels.archived }}</span>
        </el-form-item>
    </ManagementDialog>
</template>

<style scoped lang="scss">
.data-management {
    .data-management__load-error {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }

    .data-management__results {
        height: 100%;

        .data-management__scroll {
            height: 100%;
            overflow: auto;

            &:focus-visible {
                outline: 2px solid var(--tk-color-focus-ring);
                outline-offset: -2px;
            }

            .data-management__grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(min(100%, 224px), 1fr));
                gap: 16px;
                margin: 0;
                padding: 0;
                list-style: none;

                .data-management__card {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    min-width: 0;
                    padding: 12px;
                    border: 1px solid var(--tk-color-border);
                    border-radius: var(--tk-radius-base);
                    background: var(--tk-color-bg-surface);

                    .data-management__summary {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;

                        .data-management__media {
                            width: 100%;
                            aspect-ratio: 16 / 9;
                            overflow: hidden;
                            border-radius: var(--tk-radius-base);
                            background: var(--tk-color-bg-page);

                            .data-management__image {
                                display: block;
                                width: 100%;
                                height: 100%;
                            }
                        }

                        .data-management__identity {
                            display: flex;
                            flex: 1;
                            flex-wrap: wrap;
                            align-items: center;
                            gap: 4px 12px;
                            min-width: 0;

                            .data-management__name {
                                flex: 1 1 6em;
                                min-width: 0;
                                margin: 0;
                                font-size: 18px;
                                line-height: 1.35;
                                overflow-wrap: anywhere;
                            }

                            .data-management__status {
                                display: flex;
                                align-items: center;
                                gap: 5px;
                                margin: 0;
                                color: var(--tk-color-text-secondary);
                                font-size: 13px;
                                line-height: 1.3;

                                &::before {
                                    flex: none;
                                    width: 6px;
                                    height: 6px;
                                    border-radius: 50%;
                                    background: var(--tk-color-text-tertiary);
                                    content: '';
                                }

                                &.is-active::before {
                                    background: color-mix(in srgb, var(--tk-color-success) 70%, var(--tk-color-text-primary));
                                }
                            }
                        }

                        &.data-management__summary--avatar {
                            flex-direction: row;
                            align-items: center;

                            .data-management__media {
                                flex: 0 0 64px;
                                width: 64px;
                                aspect-ratio: 1;
                            }
                        }
                    }

                    .data-management__footer {
                        display: flex;
                        flex-wrap: wrap;
                        align-items: center;
                        gap: 6px 8px;
                        margin-block-start: auto;
                        padding-block-start: 8px;
                        border-top: 1px solid var(--tk-color-border-disabled);

                        .data-management__detail {
                            min-width: 0;
                            color: var(--tk-color-text-secondary);
                            font-size: 13px;
                            line-height: 1.4;
                            overflow-wrap: anywhere;
                        }

                        .data-management__ecu {
                            flex: 1 1 0;
                            min-width: 0;

                            .data-management__ecu-name {
                                display: block;
                                box-sizing: border-box;
                                width: fit-content;
                                max-width: 100%;
                                padding: 2px 6px;
                                overflow: hidden;
                                border-radius: var(--tk-radius-base);
                                background: var(--tk-color-bg-page);
                                color: var(--tk-color-text-secondary);
                                font-size: 13px;
                                line-height: 1.4;
                                text-overflow: ellipsis;
                                white-space: nowrap;
                            }
                        }

                        .data-management__actions {
                            display: flex;
                            flex-wrap: wrap;
                            justify-content: flex-end;
                            gap: 4px;
                            margin-inline-start: auto;

                            .el-button {
                                min-height: 28px;
                                margin-inline-start: 0;

                                &:focus-visible {
                                    outline: 2px solid var(--tk-color-focus-ring);
                                    outline-offset: 2px;
                                }
                            }
                        }
                    }
                }
            }

            .data-management__empty {
                margin: 0;
                padding: 40px 16px;
                color: var(--tk-color-text-secondary);
                text-align: center;
            }
        }
    }
}

.data-management__ecu-editor {
    .data-management__ecu-fields {
        display: grid;
        justify-items: start;
        gap: 8px;
        width: 100%;

        .data-management__ecu-field {
            display: flex;
            gap: 8px;
            width: 100%;
            min-width: 0;
        }
    }
}
</style>
