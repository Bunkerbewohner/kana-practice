import React = require("react")

interface ProgressTableProps {
    progress: [{stack: string; text: string; progress: number}];
}

export default class ProgressTable extends React.Component<ProgressTableProps,{}> {
    render() {
        return <div className="ProgressTable">
            
        </div>
    }
}