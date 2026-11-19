<script setup lang="ts">
const open = defineModel<boolean>({ required: true })
defineProps<{
    title: string
    saving?: boolean
    error?: string
    submitDisabled?: boolean
    readonly?: boolean
    wide?: boolean
}>()
defineEmits<{ submit: []; closed: [] }>()
</script>

<template>
    <el-dialog v-model="open" :title="title" :width="wide ? 'min(640px, calc(100% - 32px))' : 'min(520px, calc(100% - 32px))'"
        :close-on-click-modal="!saving" :close-on-press-escape="!saving" :show-close="!saving"
        @closed="$emit('closed')">
        <el-form class="management-dialog" label-position="top" :disabled="saving"
            @submit.prevent="!readonly && !submitDisabled && !saving && $emit('submit')">
            <slot />
            <p v-if="error" class="management-dialog__error" role="alert">{{ error }}</p>
            <div class="management-dialog__actions">
                <el-button :disabled="saving" @click="open = false">{{ readonly ? '关闭' : '取消' }}</el-button>
                <el-button v-if="!readonly" type="primary" native-type="submit" :loading="saving"
                    :disabled="submitDisabled">保存</el-button>
            </div>
        </el-form>
    </el-dialog>
</template>

<style scoped lang="scss">
.management-dialog {
    display: grid;
    gap: 16px;

    :deep(.el-form-item) {
        margin-bottom: 0;
    }

    .management-dialog__error {
        margin: 0;
        color: var(--tk-color-error);
    }

    .management-dialog__actions {
        display: flex;
        justify-content: flex-end;
    }
}
</style>
