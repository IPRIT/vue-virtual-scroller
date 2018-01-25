<template>
  <div id="app">
    <div class="counter">
      <span>
        <input v-model="countInput" type="number" min="0" max="500000" /> items
      </span>
      <label>
        <input v-model="enableLetters" type="checkbox" /> variable height
      </label>
      <span>
        <input v-model.number="buffer" type="number" min="1" max="500000" /> buffer
      </span>
      <span>
        <input v-model.number="poolSize" type="number" min="1" max="500000" /> poolSize
      </span>
      <span v-if="generateTime !== null">
        Items generation: {{ generateTime }} ms
      </span>
      <span>
        Updates: {{ updateCount }}
      </span>
      <span>
        <button @mousedown="showScroller = !showScroller">Toggle scroller</button>
        <button @mousedown="addItems()">Add 100 items</button>
        <label><input type="checkbox" v-model="scopedSlots" /> Scoped slots</label>
      </span>

    </div>

    <div class="dialog">
      <virtual-scroller v-if="scopedSlots"
                        class="scroller"
                        :items="items"
                        :itemHeight="54"
                        :anyHeight="enableLetters"
                        mainTag="section"
                        contentTag="table"
                        :buffer="buffer"
                        :poolSize="poolSize">
        <template slot-scope="props">
          <tr v-if="props.item.type === 'letter'" class="letter" :key="props.itemKey">
            <td class="index">{{props.item.index}}</td>
            <td>{{props.item.value}} Scoped</td>
          </tr>
          <item v-if="props.item.type === 'person'" :item="props.item" :key="props.itemKey"></item>
        </template>
      </virtual-scroller>
    </div>

    <div class="content" v-if="showScroller">
      <div class="wrapper">
        <virtual-scroller v-if="scopedSlots"
                          class="scroller"
                          :items="items"
                          :itemHeight="54"
                          :anyHeight="enableLetters"
                          mainTag="section"
                          contentTag="table"
                          :buffer="buffer"
                          :poolSize="poolSize"
                          emitUpdate
                          @update="onUpdate">
          <template slot-scope="props">
            <tr v-if="props.item.type === 'letter'" class="letter" :key="props.itemKey">
              <td class="index">
                {{props.item.index}}
              </td>
              <td>
                {{props.item.value}} Scoped
              </td>
            </tr>
            <item v-if="props.item.type === 'person'" :item="props.item" :key="props.itemKey"></item>
          </template>
        </virtual-scroller>

        <virtual-scroller v-else
                          class="scroller"
                          :items="items"
                          :renderers="renderers"
                          type-field="type"
                          key-field="index"
                          main-tag="section"
                          content-tag="table"
                          :buffer="buffer"
                          :pool-size="poolSize"
                          emit-update
                          @update="onUpdate"/>
      </div>
    </div>
  </div>
</template>

<script>
import { getData } from './data.js'

import Letter from './Letter.vue'
import Item from './Item.vue'

const renderers = {
  letter: Letter,
  person: Item,
}

export default {
  components: {
    Letter,
    Item,
  },

  data: () => ({
    items: [],
    renderers,
    count: 1000,
    generateTime: null,
    updateTime: null,
    showScroller: true,
    scopedSlots: true,
    buffer: 200,
    poolSize: 2000,
    enableLetters: true,
    updateCount: 0,
  }),

  watch: {
    count () {
      this.generateItems()
    },
    enableLetters () {
      this.generateItems()
    },
  },

  computed: {
    countInput: {
      get () {
        return this.count
      },
      set (val) {
        if (val > 500000) {
          val = 500000
        } else if (val < 0) {
          val = 0
        }
        this.count = val
      },
    },

    itemHeight () {
      return this.enableLetters ? null : 50
    },
  },

  methods: {
    generateItems () {
      console.log('Generating ' + this.count + ' items...')
      let time = Date.now()
      const items = getData(this.count, this.enableLetters)
      this._time = Date.now()
      this.generateTime = this._time - time
      console.log('Generated ' + items.length + ' in ' + this.generateTime + 'ms')
      this._dirty = true
      this.items = items
    },

    addItems () {
      console.log('Generating ' + this.count + ' items...')
      let time = Date.now()
      const items = getData(100, this.enableLetters)
      this._time = Date.now()
      this.generateTime = this._time - time
      console.log('Generated ' + items.length + ' in ' + this.generateTime + 'ms')
      this._dirty = true
      this.items.push(...items);
    },

    onUpdate (startIndex, endIndex) {
      this.updateCount++
    },
  },

  updated () {
    if (this._dirty) {
      const time = Date.now()
      this.updateTime = time - this._time
      console.log('update', this.updateTime, 'ms')
      this._dirty = false
    }
  },

  mounted () {
    this.$nextTick(this.generateItems)
  },
}
</script>

<style>
html,
body,
#app {
  height: 100%;
  box-sizing: border-box;
}

body {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  margin: 0;
}

#app {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 12px;
}

.counter {
  flex: auto 0 0;
  text-align: center;
  margin-bottom: 12px;
  line-height: 32px;
}

.counter > *:not(:last-child) {
  margin-right: 24px;
}

.content {
  flex: 100% 1 1;
  border: solid 1px #42b983;
  position: relative;
}

.wrapper {
  overflow: hidden;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
}

.scroller {
  width: 100%;
  height: 100%;
  max-height: 500px;
}

.item-container {
  box-sizing: border-box;
}

.item {
  height: 100px;
  cursor: pointer;
  user-select: none;
  -moz-user-select: none;
  -webkit-user-select: none;
}

.item:hover {
  background: #4fc08d;
  color: white;
}

.letter {
  text-transform: uppercase;
  color: grey;
  font-weight: bold;
}

.letter td {
  padding: 12px;
  height: 200px;
  box-sizing: border-box;
}

.index {
  color: rgba(0, 0, 0, 0.2);
  width: 55px;
  text-align: right;
}

table {
  border-collapse: collapse;
}

.person td:first-child {
  padding: 12px;
}

.person .info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  border: 1px solid #ff4834;
}

.avatar {
  width: 50px;
  height: 50px;
  margin-right: 12px;
}
  .dialog {
    position: fixed;
    margin: 100px;
    margin-top: 0;
    min-width: 400px;
    min-height: 400px;
    max-height: calc(100% - 200px);
    box-sizing: border-box;
    background: white;
    padding: 20px;
    border-radius: 5px;
    box-shadow: 0 2px 2px 2px rgba(0,0,0,.1);
    z-index: 2;
    overflow: hidden;
    top: 100px;
  }
</style>
