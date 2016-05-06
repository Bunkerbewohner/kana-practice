import React = require("react")
import {getProgress} from "../store/store"

declare var $: any;

interface Props {
    progress: {[key: string]: {stack: string; text: string; progress: number;}};   
    onBack: () => void;
    onPlay: () => void;
}

interface State {
    showBefore: boolean;
}

export default class GameOver extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            showBefore: true
        }
    }
    
    componentDidMount() {
        setTimeout(() => {
            this.setState({
                showBefore: false
            })
            
            setTimeout(() => {
                $(".GameOver .results").animate({scrollTop: $(".stats").height()}, 3000)
            }, 1500)
        }, 500)
        
        $(".GameOver .results").scrollTop(0)
    }
    
    abortScroll() {
        $(".GameOver .results").stop()
    }
    
    render() {
        return <div className="GameOver">
            <div className="results" onMouseDown={() => this.abortScroll()}>                
                <div className="stats">
                    {this.stats()}
                    <a name="end"></a>
                </div>
            </div>
            <footer>
                <div><button onClick={() => this.props.onBack()}><img src="images/arrow_left_alt.png" height="28" width="28"/> go back</button></div>
                <div><button onClick={() => this.props.onPlay()}><img src="images/reload.png" height="28" width="28"/>  play again</button></div>
            </footer>
        </div>
    }
    
    stats() {
        var progress = this.props.progress
        
        return Object.keys(progress).map(p => progress[p]).sort((a, b) =>  getProgress(a.stack, a.text) - getProgress(b.stack, b.text)).map(p => {
            var now = Math.min(100, getProgress(p.stack, p.text))
            var before = Math.max(0, now - p.progress)
            
            var style = {
                width: (this.state.showBefore ? before : now) + "%",
                backgroundColor: this.progressToColor(before)
            }
            
            return <div className="stat">
                <label>{p.text}</label>
                <div className="progress">
                    <div className="progress-bar">
                        <span className="percent">{this.state.showBefore ? before : now}%</span>
                        <div className="bar" style={style}></div>
                    </div>
                </div>
            </div>
        })
    }
    
    progressToColor(percent: number): string {
        if (percent == 100) return "#69db5e"
        else if (percent >= 80) return "#99db5e"
        else if (percent >= 60) return "#c2db5e"
        else if (percent >= 40) return "#dbd15e"
        else if (percent >= 20) return "#dba15e"
        else return "#db695e"
    }
}