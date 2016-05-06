import {Store} from "interfaces"
import http from "../util/http"

var callbacks = []

var store: Store = {
    stacks: {},
    progress: {},
    selectedStacks: [],
    cards: [],
    lastMatch: undefined,
    view: "StackSelect"
}

export function getStore() {
    return store
}

export function updateStore(s: any) {
    var update: any = {}
    for (let key in store) {
        update[key] = store[key]
    }
    for (let key in s) {
        update[key] = s[key]
    }
    store = update
    
    callbacks.forEach(cb => cb(store))    
}

export function getProgress(stackName: string, cardText: string): number {
    return store.progress[`${stackName}.${cardText}`] || 0
}

export function updateProgress(entries: {stackName: string, cardText: string, progress: number}[]) {
    entries.forEach(entry => {
        store.progress[`${entry.stackName}.${entry.cardText}`] = entry.progress    
    })
    
    updateStore({progress: store.progress})
}

export function onStoreChanged(callback: (store: Store)=>void): number {
    const key = callbacks.length
    callbacks.push(callback)
    return key
}

export function restore() {    
    let serialized = localStorage.getItem("store")
    if (serialized != null) {
        let deserialized = JSON.parse(serialized)        
        updateStore(deserialized)
    }
    
    http.get("data/cards.json", (kana) => {
        const stacks = {}
        
        for (let name in kana) {
            stacks[name] = kana[name].map(arr => ({
                stack: name,
                text: arr[0], 
                translation: arr[1]
            }))
        }
                               
        const selectedStacks = store.selectedStacks.length == 0 ? Object.keys(stacks).slice(0, 1) : store.selectedStacks
        updateStore({stacks, selectedStacks})
        persist()
    })
}

export function persist() {    
    localStorage.setItem("store", JSON.stringify(store))
}