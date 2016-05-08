import React = require("react")
import {FlashCard} from "../store/interfaces"
import {range, flatten, sign} from "../util/math"
import {getProgress} from "../store/store"

interface SwapBoardProps {
    cards: FlashCard[];
    size: number;
    onMatch?: (FlashCard)=>void;
    onMiss?: (FlashCard)=>void;
    onFinished?: ()=>void;
    onBack?: ()=>void;
}

interface SwapBoardState {
    board: SwapCard[];
    selected?: SwapCard;
    processing?: boolean;
    lastMatch?: FlashCard;
    score?: number;
    welcome?: string;
    finalWord?: string;
}

interface SwapCard {
    x: number;
    y: number;
    flashcard: FlashCard;
    flipped: boolean;
    solved: boolean;
}

function match(a: SwapCard, b: SwapCard): boolean {
    return a != null && b != null && a.flashcard.stack == b.flashcard.stack && a.flashcard.text == b.flashcard.text && a.flipped != b.flipped
}

function equals(a: SwapCard, b: SwapCard): boolean {
    return a != null && b != null && a.flashcard.stack == b.flashcard.stack && a.flashcard.text == b.flashcard.text && a.flipped == b.flipped
}

export default class SwapBoard extends React.Component<SwapBoardProps, SwapBoardState> {       
    private dragStartXY = {x: 0, y: 0}
    private afterUpdate: () => void = null
    
    constructor(props: SwapBoardProps) {
        super(props);        
        this.state = {
            board: this.createBoard(props),
            selected: null,
            processing: false,
            score: 0,
            lastMatch: null,
            welcome: this.spruch(false),
            finalWord: this.spruch(true)
        }
    }
    
    componentWillReceiveProps(newProps) {
        if (this.props.cards != newProps.cards) {
            this.setState({
                board: this.createBoard(newProps),
                score: 0,
                processing: false,
                selected: null,
                lastMatch: null,
                welcome: this.spruch(false),
                finalWord: this.spruch(true)
            })
        }
    }
    
    componentDidUpdate() {
        if (this.afterUpdate) {
            const callback = this.afterUpdate
            this.afterUpdate = null
            callback()            
        }
    }        
    
    back(e) {
        e.preventDefault()
        if (this.props.onBack) {            
            this.props.onBack()
        }
    }
    
    render() {
        const props = this.props
        const cards = this.state.board                
        const finished = cards.filter(c => !c.solved).length == 0
        
        return <div className="SwapBoard" onMouseMove={(e) => this.onMouseMove(e)}
            onTouchEnd={(e) => this.onTouchEnd(e)} onTouchMove={(e) => this.onTouchMove(e)} onMouseLeave={(e) => this.onMouseUp(e)}
            onTouchCancel={(e) => this.onTouchEnd(e)}>
            
            <header>
                <a href="#" className="back" onClick={(e) => this.back(e)}><img src="images/arrow_left_alt.png"/></a>
                <div className="score">
                    <img src="images/star.png" height="28" width="28"/> {this.state.score}
                </div>
                <div className="lastMatch">
                    {this.state.lastMatch != null && !finished
                        ? <span className="match">
                            <span className="text">{this.state.lastMatch.text}</span> <span className="translation">({this.state.lastMatch.translation})</span>
                        </span> 
                        : <span className="match">{finished ? this.state.finalWord : this.state.welcome}</span>}
                </div>
            </header>
            
            {cards.map(c => <Card key={`card-${c.flashcard.text}${c.flipped ? '-flipped' : ''}`} selected={equals(this.state.selected, c)} 
                ref={"card-"+c.x+"-"+c.y} card={c} onMouseDown={(c, e) => this.onMouseDown(c,e)} onMouseUp={(c, e) => this.onCardMouseUp(c, e)} />)}                            
        </div>
    }
    
    spruch(finished: boolean) {
        if (finished) {
            let sprueche = [
                "Finished!",
                "Good job!",
                "すごい！",
                "さすが！",
                "すばらしい！",
                "Excellent!",
                "Done!",
                "お大事に",
                "ありがとう。"
            ]
            
            let index = Math.round(Math.random() * (sprueche.length - 1))
            return sprueche[index]
        } else {
            let sprueche = [
               "Let's go!",
               "Let's Vitamin!",
               "いきましょう！",
               "Good luck!",
               "ぐっど･らっく！",
               "ようこそ",
               "Welcome",
               "Let's play!",
               "Go!"
            ]
            
            let index = Math.round(Math.random() * (sprueche.length - 1))
            return sprueche[index]
        }
    }
    
    createBoard(props: SwapBoardProps): SwapCard[] {        
        const cards = props.cards
        const size = props.size
        const random = (a,b) => Math.random() >= 0.5 ? -1 : 1
        const flipped = cards.map(c => ({flashcard: c, flipped: true})).sort(random)
        const notFlipped = cards.map(c => ({flashcard: c, flipped: false})).sort(random)    
        const positions = flatten(range(0, size).map(x => range(0, size).map(y => ({x,y})))).sort(random)    
        const result: SwapCard[] = []    
        const pool = cards.slice()
        
        while (positions.length >= 2 && pool.length > 0) {
            const card = pool.pop()
            
            const pos = positions.pop()        
            result.push({ x: pos.x, y: pos.y, flashcard: card, flipped: true, solved: false })
            
            const pos2 = positions.pop()
            result.push({ x: pos2.x, y: pos2.y, flashcard: card, flipped: false, solved: false })
        }
        
        // optimize the arrangement for minimal required swaps
        const optimized: FlashCard[] = []
        
        for (var i = 0; i < result.length; i++) {            
            const cur = result[i]
            if (optimized.indexOf(cur.flashcard) >= 0) continue;
            
            // dont optimize cards past a certain confidence (50%)
            if (getProgress(cur.flashcard.stack, cur.flashcard.text) >= 50 && Math.random() > 0.33) continue;
            
            const neighbors = cardNeighbors(result, cur)
            const matchNeighbor = neighbors.filter(c => c.flashcard == cur.flashcard)
            
            if (matchNeighbor.length == 0) {
                // replace one of the neighbors
                const which = Math.round(Math.random() * 100) % neighbors.length
                const leftSwap = {flashcard: neighbors[which].flashcard, flipped: neighbors[which].flipped}
                const rightSwap = result.filter(c => c.flashcard == cur.flashcard && c.flipped != cur.flipped)[0]               
                
                neighbors[which].flashcard = cur.flashcard
                neighbors[which].flipped = !cur.flipped
                
                rightSwap.flashcard = leftSwap.flashcard
                rightSwap.flipped = leftSwap.flipped                                
            }
            
            optimized.push(cur.flashcard)
        }
        
        return result
    }
    
    swapCards(board: SwapCard[], a: SwapCard, b: SwapCard): SwapCard[] {
        return board.map(card => {
            if (card.x == a.x && card.y == a.y) {                
                return {flashcard: card.flashcard, flipped: card.flipped, solved: card.solved, x: b.x, y: b.y} 
            } else if (card.x == b.x && card.y == b.y) {
                return {flashcard: card.flashcard, flipped: card.flipped, solved: card.solved, x: a.x, y: a.y}
            } else {
                return card
            }
        })
    }
    
    solveCards(board: SwapCard[], a: SwapCard, b: SwapCard): SwapCard[] {
        return board.map(card => {
            if (card.x == a.x && card.y == a.y) {                
                return {flashcard: card.flashcard, flipped: card.flipped, solved: true, x: card.x, y: card.y} 
            } else if (card.x == b.x && card.y == b.y) {
                return {flashcard: card.flashcard, flipped: card.flipped, solved: true, x: card.x, y: card.y}
            } else {
                return card
            }
        })
    }
    
    trySwap(card: SwapCard, selected?: SwapCard) {
        if (!selected) selected = this.state.selected                
        
        this.dragStartXY = null
        
        this.afterUpdate = () => {
            setTimeout(() => {            
                // now check if the move was valid or not                            
                const couldHaveMatched = (a: SwapCard, b: SwapCard) => {
                    const aMatch = cardNeighbors(this.state.board, a).filter(c => match(c, a)).length > 0
                    const bMatch = cardNeighbors(this.state.board, b).filter(c => match(c, b)).length > 0                
                    return aMatch// || bMatch
                }            
                
                if (match(selected, card)) {
                    // solved = valid move
                    if (this.props.onMatch) {
                        this.props.onMatch(card.flashcard)
                    }
                    
                    setTimeout(() => {
                        this.setState({
                            board: this.solveCards(this.state.board, selected, card)
                        })
                        
                        setTimeout(() => {
                            this.setState({
                                board: this.shakeBoard(this.state.board, [selected, card]),                    
                                processing: false,
                                selected: null,
                                lastMatch: selected.flashcard,
                                score: this.state.score + 20
                            })  
                        }, 250)
                    }, 100)                                                                        
                } else if (couldHaveMatched(selected, card)) {                                
                    // could have solved = invalid move
                    if (this.props.onMiss) {
                        this.props.onMiss(selected.flashcard)
                    }
                    
                    // reverse the swap                
                    setTimeout(() => {
                        this.setState({
                            board: this.swapCards(this.state.board, selected, card),
                            processing: false,
                            selected: selected,
                            score: this.state.score - 20
                        })    
                    }, 100)                                  
                } else {
                    // swap = valid move
                    this.setState({
                        board: this.state.board,
                        processing: false,
                        selected: selected
                    })
                }
            }, 200)
        }
        
        // first animate the swap of the two cards regardless of whether it's a valid move or not        
        this.setState({
            board: this.swapCards(this.state.board, selected, card), 
            processing: true,
            selected: selected
        })
    }
    
    shakeBoard(board: SwapCard[], solved: SwapCard[]): SwapCard[] {        
        board = board.slice()
        const minY = Math.min.apply(this, solved.map(c => c.y))
        const maxY = Math.max.apply(this, solved.map(c => c.y))
        const xs = solved.map(c => c.x)
        
        
        board.forEach(c => {
            if (!c.solved && xs.indexOf(c.x) >= 0 && c.y < maxY) {
                c.y += (1 + maxY - minY)
            }
        })
                       
        this.closeGaps(board)        
        
        if (board.filter(c => !c.solved).length == 0 && this.props.onFinished) {
            this.props.onFinished()
        }
        
        return board
    }
    
    closeGaps(board: SwapCard[], again: boolean = true): SwapCard[] {
        // look for horizontal gaps
        for (let col = 0; col < this.props.size; col++) {
            const prev = col > 0 ? board.filter(c => c.x == col - 1 && !c.solved).length : 0
            const cur = board.filter(c => c.x == col && !c.solved).length
            const next = col < this.props.size - 1 ? board.filter(c => c.x == col + 1 && !c.solved).length : 0
            
            if (cur == 0) {
                if (col < this.props.size/2) {
                    board.filter(c => c.x < col && !c.solved).forEach(c => c.x = c.x + 1)
                } else {
                    board.filter(c => c.x > col && !c.solved).forEach(c => c.x = c.x - 1)
                }
            }
        }
        
        if (again) {
            this.closeGaps(board, false)
        }
        
        return board
    }   
    
    onMouseDown(card: SwapCard, e: React.MouseEvent) {                
        const selected = this.state.selected
        
        // disabled swap on tap for now because it's not working right
        if (selected && false) {
            const dist = Math.sqrt(Math.pow(card.x - selected.x, 2) + Math.pow(card.y - selected.y, 2))
            if (dist == 1) {
                this.trySwap(card, selected)
                return;
            }            
        }
                
        // select the new card
        this.setState({
            board: this.state.board,
            selected: card
        })
        
        this.dragStartXY = { x: e.clientX, y: e.clientY }                         
    }
    
    onTouchMove(e: React.TouchEvent) {
        e.preventDefault()
        if (e.touches.length > 0) {
            this.onMouseMove(e.touches[0] as any)
        }
    }
    
    onMouseMove(e: React.MouseEvent) {          
        if (this.state.selected == null || this.dragStartXY == null) return
                      
        const dx = e.clientX - this.dragStartXY.x
        const dy = e.clientY - this.dragStartXY.y        
        const length = Math.sqrt(dx * dx + dy * dy)
        
        if (length > 20) {
            const dir = Math.abs(dx) > Math.abs(dy) ? {x: sign(dx), y: 0} : {x: 0, y: sign(dy)}
            if (dir.x == 0 && dir.y == 0) return
            
            const selected = this.state.selected
            const swap = this.state.board.filter(c => !c.solved && c.x == selected.x + dir.x && c.y == selected.y + dir.y)[0]            
            
            if (swap) {
                this.trySwap(swap, selected)
            }
        }                    
    }
    
    onTouchEnd(e: React.TouchEvent) {                
        this.onMouseUp(e.targetTouches[0] as any)        
    }
    
    onCardTouchEnd(card: SwapCard, e: React.TouchEvent) {        
        this.onCardMouseUp(card, e.targetTouches[0] as any)
    }       
    
    onMouseUp(e: React.MouseEvent) {
        this.dragStartXY = null                
    }
    
    onCardMouseUp(card: SwapCard, e: React.MouseEvent) {        
        this.dragStartXY = null                
    }
}

function cardStyle(card: SwapCard, selected: boolean = false) {
    return {        
        transform: transform(card.x * 100, card.y * 100, selected ? 2 : 1, card.solved ? 0 : 1)
    }
}

interface CardProps {
    card: SwapCard;
    onMouseDown: (card: SwapCard, e: React.MouseEvent) => void;
    onMouseUp: (card: SwapCard, e: React.MouseEvent) => void;
    selected?: boolean;
}

class Card extends React.Component<CardProps, {}> {
    render() {
        const props = this.props
        const card = props.card
        const className = "Card" + (props.card.solved ? " solved" : "") + (props.selected ? " selected" : "")
        
        return <div className={className} style={cardStyle(card, this.props.selected)} 
            onMouseDown={(e) => props.onMouseDown(card, e)} onMouseUp={(e) => props.onMouseUp(card, e)} 
            onTouchStart={(e) => this.onTouchStart(e)} onTouchEnd={(e) => this.onTouchEnd(e)}
            onTouchCancel={(e) => this.onTouchEnd(e)}
            >            
            {card.flipped ? card.flashcard.translation : card.flashcard.text}            
        </div>
    }
    
    onTouchStart(e: React.TouchEvent) {
        if (e.touches.length > 0) {
            this.props.onMouseDown(this.props.card, e.touches[0] as any)
        }
    }
    
    onTouchEnd(e: React.TouchEvent) {
        if (e.changedTouches.length > 0) {            
            this.props.onMouseUp(this.props.card, e.changedTouches[0] as any)
        }
    }
}

function cardNeighbors(board: SwapCard[], cur: SwapCard): SwapCard[] {
    return board.filter(c => !c.solved && ((Math.abs(c.x - cur.x) == 1 && c.y == cur.y) || (Math.abs(c.y - cur.y) == 1 && c.x == cur.x)))
}

function cardNeighborsAt(board: SwapCard[], xy: {x: number, y: number}): SwapCard[] {
    return board.filter(c => !c.solved && ((Math.abs(c.x - xy.x) == 1 && c.y == xy.y) || (Math.abs(c.y - xy.y) == 1 && c.x == xy.x)))
}

function transform(x: number, y: number, z: number = 1, scale: number = 1): string {     
    return `translate3d(${x}px, ${y}px, ${z}px) scale(${scale})`
}