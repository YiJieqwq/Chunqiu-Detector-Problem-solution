<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
const { page } = useData()
function openSidebar() { document.querySelector<HTMLButtonElement>('.VPLocalNav button.menu')?.click() }
const english = computed(() => page.value.relativePath.startsWith('en/'))
const languagePath = computed(() => withBase(english.value ? '/en/' : '/zh/'))
const chapter = computed(() => {
  const path = page.value.relativePath
  const en = english.value
  if (/\/items\.md$/.test(path)) return en ? 'Chapter 3 · Detection Items' : '第三章 · 正文'
  if (/\/prologue\.md$/.test(path)) return en ? 'Chapter 2 · Prologue' : '第二章 · 前言'
  if (/^(zh|en)\/index\.md$/.test(path)) return en ? 'Chapter 1 · Overview' : '第一章 · 概述'
  return page.value.title
})
</script>

<template>
  <button class="cq-mobile-sidebar" type="button" @click="openSidebar">{{ english ? 'Open sidebar' : '打开侧边栏' }}</button>
  <nav class="cq-breadcrumbs" :aria-label="english ? 'Breadcrumb' : '当前位置'">
    <a :href="withBase('/')">{{ english ? 'Home' : '首页' }}</a>
    <span aria-hidden="true">›</span>
    <a :href="languagePath">{{ english ? 'English Docs' : '中文文档' }}</a>
    <span aria-hidden="true">›</span>
    <span aria-current="page">{{ chapter }}</span>
  </nav>
</template>
