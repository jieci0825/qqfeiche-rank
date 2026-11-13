<template>
    <div class="records-grid">
        <slot />
    </div>
</template>

<style scoped lang="scss">
.records-grid {
    display: grid;
    flex: 1;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 20px;
    align-content: start;
}
</style>
