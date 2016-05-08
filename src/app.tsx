/// <reference path="../lib/typings/react/react.d.ts"/>
/// <reference path="../lib/typings/react/react-dom.d.ts"/>

import React = require("react")
import ReactDOM = require("react-dom")
import http from "util/http"
import SwapBoard from "components/SwapBoard"
import {FlashCard, Store} from "store/interfaces"
import {getStore, restore, persist, updateStore, onStoreChanged, getProgress, updateProgress} from "store/store"
import StackSelect from "components/StackSelect"
import {flatten, shuffle} from "util/math"
import GameOver from "components/GameOver"
import buzz = require("buzz")

var sounds = {
    miss: new buzz.sound("sounds/bell.ogg"),
    match: new buzz.sound("sounds/coins.ogg"),
    finish: new buzz.sound("sounds/success.ogg")
}

interface AppState {
    progressed: {[key: string]: {stack: string; text: string; progress: number;}};
    gameover?: boolean;
}

export default class App extends React.Component<Store, AppState> {
    state = {
        progressed: {} as {[key: string]: {stack: string; text: string; progress: number;}},
        gameover: false
    }        
    
    render() {
        const props = this.props
        switch (props.view) {
            case "StackSelect": 
                return <StackSelect stacks={props.stacks} selectedStacks={props.selectedStacks} 
                    onStackSelection={this.onStackSelection.bind(this)} onStartPressed={this.onStart.bind(this)}/>
            case "SwapGame": 
                return <div className={this.state.gameover ? "GameFrame gameover" : "GameFrame"}>          
                    <div className={this.state.gameover ? "show GameOverWrapper" : "GameOverWrapper"}>
                        {this.state.gameover ? <GameOver onBack={() => this.onBack()} onPlay={() => this.onPlayAgain()} progress={this.state.progressed}/> : null}
                    </div>          
                    <SwapBoard cards={props.cards} size={6} onBack={() => this.onBack()}
                        onMiss={(card) => this.onMiss(card)} onMatch={(card) => this.onMatch(card)} onFinished={() => this.onFinished()}/>
                </div>        
        }       
    }
    
    onBack() {
        this.setState({
            progressed: {},
            gameover: false
        })
        
        updateStore({
            view: "StackSelect"            
        })
        
        persist()
    }
    
    onMiss(card: FlashCard) {                
        const progressed = this.state.progressed
        const record = progressed[`${card.stack}.${card.text}`] || {stack: card.stack, text: card.text, progress: 0}
        record.progress = record.progress - 30                
        progressed[`${card.stack}.${card.text}`] = record
        this.setState({progressed})
        sounds.miss.play()                
    }
    
    onMatch(card: FlashCard) {
        const progressed = this.state.progressed
        const record = progressed[`${card.stack}.${card.text}`] || {stack: card.stack, text: card.text, progress: 0}
        record.progress = record.progress + 15                
        progressed[`${card.stack}.${card.text}`] = record
        this.setState({progressed})
        sounds.match.play()        
    }
    
    onFinished() {
        sounds.finish.play()
        
        // update the progress
        const progressed = this.state.progressed
        
        const update = []
        for (let key in progressed) {
            let entry = progressed[key]
            let progress = Math.max(0, Math.min(100, getProgress(entry.stack, entry.text) + entry.progress))
            update.push({stackName: entry.stack, cardText: entry.text, progress: progress})
        }
        
        updateProgress(update)
        
        this.setState({
            progressed: this.state.progressed,
            gameover: true
        })
        persist()
        
        //this.setState({progressed: {}})
        //updateStore({
        //    view: "StackSelect"
        //})                
    }
    
    onPlayAgain() {
        this.setState({
            progressed: {},
            gameover: false
        })
        
        setTimeout(() => {
            this.onStart(getStore().selectedStacks)
        }, 300)
    }
    
    onStart(selectedStacks: string[]) {
        // select random cards from sets
        var pool = shuffle(flatten(selectedStacks.map(name => this.props.stacks[name])))
        
        // mostly prefer cards with lower confidence (cards which need to be practiced)
        const sorted = pool.sort((a, b) => {            
            const progressA = getProgress(a.stack, a.text)
            const progressB = getProgress(b.stack, b.text)
            return progressA - progressB            
        })
        
        const leastConfident = sorted.slice(0, 18)
        const restPool = sorted.length > 18 ? sorted.slice(18).sort((a,b) => Math.random() >= 0.5 ? 1 : -1) : []
        const selection: FlashCard[] = []
        
        while (selection.length < Math.min(18, pool.length)) {
            var select: FlashCard = null
            
            if (restPool.length == 0 || Math.random() > 0.75) {
                select = (leastConfident.shift())
            } else {
                select = (restPool.shift())
            }
            
            if (selection.filter(s => s.translation == select.translation).length > 0) {
                continue;
            }
            
            selection.push(select)
        }
        
        updateStore({
            cards: selection,
            view: "SwapGame"
        })
    }
    
    onStackSelection(stackName: string, selected: boolean) {
        const selectedStacks = selected ? this.props.selectedStacks.concat([stackName]) : this.props.selectedStacks.filter(s => s != stackName)
        console.log(selectedStacks)
        if (selectedStacks.length > 0) {
            updateStore({selectedStacks})
            persist()
        }
    }
}

onStoreChanged((update: Store) => {    
    ReactDOM.render(<div className="App">
        <App {...update}/>
    </div>, document.getElementById("root"))
})

restore()