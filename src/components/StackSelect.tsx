import React = require("react")
import {Store, FlashCard} from "../store/interfaces"
import {getProgress, updateStore} from "../store/store"

interface StackSelectProps {
    stacks: {
        [name: string]: FlashCard[]
    };
    selectedStacks: string[];
    onStackSelection: (stackName: string, selected: boolean) => void;
    onStartPressed: (selectedStacks: string[]) => void;
}

/**
 * Component for selecting the stack of cards to practise
 */
export default class StackSelect extends React.Component<StackSelectProps,{}> {
    render() {
        return <div className="StackSelect">
            <header className="Card">
                Select Sets
            </header>
            
            {Object.keys(this.props.stacks).map(key => <StackCard key={key} stackName={key} 
                cards={this.props.stacks[key]} selected={this.props.selectedStacks.indexOf(key) >= 0} 
                onStackSelection={this.props.onStackSelection}/>)}
            
            <footer className="Card">
                <button onClick={() => this.props.onStartPressed(this.props.selectedStacks)}>Start Practice</button>
            </footer>
        </div>
    }
}

interface StackCardProps {
    stackName: string;
    selected: boolean;
    cards: FlashCard[];
    onStackSelection: (stackName: string, selected: boolean) => void;
}

class StackCard extends React.Component<StackCardProps, {}> {
    render() {
        const className = "StackCard Card" + (this.props.selected ? " selected" : "")
        const confidence = (this.props.cards.map(c => getProgress(this.props.stackName, c.text)).reduce((sum, p) => sum + p) / this.props.cards.length).toFixed(1)
        
        return <div className={className} onMouseDown={(e) => this.onClick(e)}>
            <label>{this.props.stackName}</label> 
            <span className="confidence">{this.progressBar(confidence)}</span>
        </div>
    }
    
    progressBar(progress) {              
        var style = {
            width: progress + "%",
            backgroundColor: this.progressToColor(progress)
        }
        
        return <div className="progress-bar">
                <span className="percent">{progress}%</span>
                <div className="bar" style={style}></div>
            </div>
    }
    
    progressToColor(percent: number): string {
        if (percent == 100) return "#69db5e"
        else if (percent >= 80) return "#99db5e"
        else if (percent >= 60) return "#c2db5e"
        else if (percent >= 40) return "#dbd15e"
        else if (percent >= 20) return "#dba15e"
        else return "#db695e"
    }
    
    onClick(e: React.MouseEvent) {        
        this.props.onStackSelection(this.props.stackName, !this.props.selected)        
    }
}