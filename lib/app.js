var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define("store/interfaces", ["require", "exports"], function (require, exports) {
    "use strict";
});
define("util/http", ["require", "exports"], function (require, exports) {
    "use strict";
    var http;
    (function (http) {
        function get(url, then) {
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
                if (xhr.status == 200 && xhr.readyState == 4) {
                    if (url.indexOf("json") > 0) {
                        then(JSON.parse(xhr.responseText));
                    }
                    else {
                        then(xhr.responseText);
                    }
                }
            };
            xhr.open("GET", url);
            xhr.send();
        }
        http.get = get;
    })(http || (http = {}));
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = http;
});
define("store/store", ["require", "exports", "util/http"], function (require, exports, http_1) {
    "use strict";
    var callbacks = [];
    var store = {
        stacks: {},
        progress: {},
        selectedStacks: [],
        cards: [],
        lastMatch: undefined,
        view: "StackSelect"
    };
    function getStore() {
        return store;
    }
    exports.getStore = getStore;
    function updateStore(s) {
        var update = {};
        for (var key in store) {
            update[key] = store[key];
        }
        for (var key in s) {
            update[key] = s[key];
        }
        store = update;
        callbacks.forEach(function (cb) { return cb(store); });
    }
    exports.updateStore = updateStore;
    function getProgress(stackName, cardText) {
        return store.progress[(stackName + "." + cardText)] || 0;
    }
    exports.getProgress = getProgress;
    function updateProgress(entries) {
        entries.forEach(function (entry) {
            store.progress[(entry.stackName + "." + entry.cardText)] = entry.progress;
        });
        updateStore({ progress: store.progress });
    }
    exports.updateProgress = updateProgress;
    function onStoreChanged(callback) {
        var key = callbacks.length;
        callbacks.push(callback);
        return key;
    }
    exports.onStoreChanged = onStoreChanged;
    function restore() {
        var serialized = localStorage.getItem("store");
        if (serialized != null) {
            var deserialized = JSON.parse(serialized);
            updateStore(deserialized);
        }
        http_1.default.get("data/cards.json", function (kana) {
            var stacks = {};
            var _loop_1 = function(name_1) {
                stacks[name_1] = kana[name_1].map(function (arr) { return ({
                    stack: name_1,
                    text: arr[0],
                    translation: arr[1]
                }); });
            };
            for (var name_1 in kana) {
                _loop_1(name_1);
            }
            var selectedStacks = store.selectedStacks.length == 0 ? Object.keys(stacks).slice(0, 1) : store.selectedStacks;
            updateStore({ stacks: stacks, selectedStacks: selectedStacks });
            persist();
        });
    }
    exports.restore = restore;
    function persist() {
        localStorage.setItem("store", JSON.stringify(store));
    }
    exports.persist = persist;
});
define("util/math", ["require", "exports"], function (require, exports) {
    "use strict";
    function range(startIncl, endExcl, step) {
        if (step === void 0) { step = 1; }
        var items = [];
        for (var i = startIncl; i < endExcl; i += step) {
            items.push(i);
        }
        return items;
    }
    exports.range = range;
    function flatten(items) {
        var flattened = [];
        for (var i = 0; i < items.length; i++) {
            for (var j = 0; j < items[i].length; j++) {
                flattened.push(items[i][j]);
            }
        }
        return flattened;
    }
    exports.flatten = flatten;
    function shuffle(array) {
        for (var i = array.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    }
    exports.shuffle = shuffle;
    function sign(x) {
        if (x < 0)
            return -1;
        else if (x > 0)
            return 1;
        else
            return 0;
    }
    exports.sign = sign;
});
define("components/SwapBoard", ["require", "exports", "react", "util/math"], function (require, exports, React, math_1) {
    "use strict";
    function match(a, b) {
        return a != null && b != null && a.flashcard.stack == b.flashcard.stack && a.flashcard.text == b.flashcard.text && a.flipped != b.flipped;
    }
    function equals(a, b) {
        return a != null && b != null && a.flashcard.stack == b.flashcard.stack && a.flashcard.text == b.flashcard.text && a.flipped == b.flipped;
    }
    var SwapBoard = (function (_super) {
        __extends(SwapBoard, _super);
        function SwapBoard(props) {
            _super.call(this, props);
            this.dragStartXY = { x: 0, y: 0 };
            this.afterUpdate = null;
            this.state = {
                board: this.createBoard(props),
                selected: null,
                processing: false,
                score: 0,
                lastMatch: null,
                welcome: this.spruch(false),
                finalWord: this.spruch(true)
            };
        }
        SwapBoard.prototype.componentWillReceiveProps = function (newProps) {
            if (this.props.cards != newProps.cards) {
                this.setState({
                    board: this.createBoard(newProps),
                    score: 0,
                    processing: false,
                    selected: null,
                    lastMatch: null,
                    welcome: this.spruch(false),
                    finalWord: this.spruch(true)
                });
            }
        };
        SwapBoard.prototype.componentDidUpdate = function () {
            if (this.afterUpdate) {
                var callback = this.afterUpdate;
                this.afterUpdate = null;
                callback();
            }
        };
        SwapBoard.prototype.back = function (e) {
            e.preventDefault();
            if (this.props.onBack) {
                this.props.onBack();
            }
        };
        SwapBoard.prototype.render = function () {
            var _this = this;
            var props = this.props;
            var cards = this.state.board;
            var finished = cards.filter(function (c) { return !c.solved; }).length == 0;
            return React.createElement("div", {className: "SwapBoard", onMouseMove: function (e) { return _this.onMouseMove(e); }, onTouchEnd: function (e) { return _this.onTouchEnd(e); }, onTouchMove: function (e) { return _this.onTouchMove(e); }, onMouseLeave: function (e) { return _this.onMouseUp(e); }, onTouchCancel: function (e) { return _this.onTouchEnd(e); }}, React.createElement("header", null, React.createElement("a", {href: "#", className: "back", onClick: function (e) { return _this.back(e); }}, React.createElement("img", {src: "images/arrow_left_alt.png"})), React.createElement("div", {className: "score"}, React.createElement("img", {src: "images/star.png", height: "28", width: "28"}), " ", this.state.score), React.createElement("div", {className: "lastMatch"}, this.state.lastMatch != null && !finished
                ? React.createElement("span", {className: "match"}, React.createElement("span", {className: "text"}, this.state.lastMatch.text), " ", React.createElement("span", {className: "translation"}, "(", this.state.lastMatch.translation, ")"))
                : React.createElement("span", {className: "match"}, finished ? this.state.finalWord : this.state.welcome))), cards.map(function (c) { return React.createElement(Card, {key: "card-" + c.flashcard.text + (c.flipped ? '-flipped' : ''), selected: equals(_this.state.selected, c), ref: "card-" + c.x + "-" + c.y, card: c, onMouseDown: function (c, e) { return _this.onMouseDown(c, e); }, onMouseUp: function (c, e) { return _this.onCardMouseUp(c, e); }}); }));
        };
        SwapBoard.prototype.spruch = function (finished) {
            if (finished) {
                var sprueche = [
                    "Finished!",
                    "Good job!",
                    "すごい！",
                    "さすが！",
                    "すばらしい！",
                    "Excellent!",
                    "Done!",
                    "お大事に",
                    "ありがとう。"
                ];
                var index = Math.round(Math.random() * (sprueche.length - 1));
                return sprueche[index];
            }
            else {
                var sprueche = [
                    "Let's go!",
                    "Let's Vitamin!",
                    "いきましょう！",
                    "Good luck!",
                    "ぐっど･らっく！",
                    "ようこそ",
                    "Welcome",
                    "Let's play!",
                    "Go!"
                ];
                var index = Math.round(Math.random() * (sprueche.length - 1));
                return sprueche[index];
            }
        };
        SwapBoard.prototype.createBoard = function (props) {
            var cards = props.cards;
            var size = props.size;
            var random = function (a, b) { return Math.random() >= 0.5 ? -1 : 1; };
            var flipped = cards.map(function (c) { return ({ flashcard: c, flipped: true }); }).sort(random);
            var notFlipped = cards.map(function (c) { return ({ flashcard: c, flipped: false }); }).sort(random);
            var positions = math_1.flatten(math_1.range(0, size).map(function (x) { return math_1.range(0, size).map(function (y) { return ({ x: x, y: y }); }); })).sort(random);
            var result = [];
            var pool = cards.slice();
            while (positions.length >= 2 && pool.length > 0) {
                var card = pool.pop();
                var pos = positions.pop();
                result.push({ x: pos.x, y: pos.y, flashcard: card, flipped: true, solved: false });
                var pos2 = positions.pop();
                result.push({ x: pos2.x, y: pos2.y, flashcard: card, flipped: false, solved: false });
            }
            // optimize the arrangement for minimal required swaps
            var optimized = [];
            var _loop_2 = function() {
                var cur = result[i];
                if (optimized.indexOf(cur.flashcard) >= 0)
                    return "continue";
                // dont optimize cards past a certain confidence (50%)
                //if (getProgress(cur.flashcard.stack, cur.flashcard.text) >= 50) continue;
                var neighbors = cardNeighbors(result, cur);
                var matchNeighbor = neighbors.filter(function (c) { return c.flashcard == cur.flashcard; });
                if (matchNeighbor.length == 0) {
                    // replace one of the neighbors
                    var which = Math.round(Math.random() * 100) % neighbors.length;
                    var leftSwap = { flashcard: neighbors[which].flashcard, flipped: neighbors[which].flipped };
                    var rightSwap = result.filter(function (c) { return c.flashcard == cur.flashcard && c.flipped != cur.flipped; })[0];
                    neighbors[which].flashcard = cur.flashcard;
                    neighbors[which].flipped = !cur.flipped;
                    rightSwap.flashcard = leftSwap.flashcard;
                    rightSwap.flipped = leftSwap.flipped;
                }
                optimized.push(cur.flashcard);
            };
            for (var i = 0; i < result.length; i++) {
                var state_2 = _loop_2();
                if (state_2 === "continue") continue;
            }
            return result;
        };
        SwapBoard.prototype.swapCards = function (board, a, b) {
            return board.map(function (card) {
                if (card.x == a.x && card.y == a.y) {
                    return { flashcard: card.flashcard, flipped: card.flipped, solved: card.solved, x: b.x, y: b.y };
                }
                else if (card.x == b.x && card.y == b.y) {
                    return { flashcard: card.flashcard, flipped: card.flipped, solved: card.solved, x: a.x, y: a.y };
                }
                else {
                    return card;
                }
            });
        };
        SwapBoard.prototype.solveCards = function (board, a, b) {
            return board.map(function (card) {
                if (card.x == a.x && card.y == a.y) {
                    return { flashcard: card.flashcard, flipped: card.flipped, solved: true, x: card.x, y: card.y };
                }
                else if (card.x == b.x && card.y == b.y) {
                    return { flashcard: card.flashcard, flipped: card.flipped, solved: true, x: card.x, y: card.y };
                }
                else {
                    return card;
                }
            });
        };
        SwapBoard.prototype.trySwap = function (card, selected) {
            var _this = this;
            if (!selected)
                selected = this.state.selected;
            this.dragStartXY = null;
            this.afterUpdate = function () {
                setTimeout(function () {
                    // now check if the move was valid or not                            
                    var couldHaveMatched = function (a, b) {
                        var aMatch = cardNeighbors(_this.state.board, a).filter(function (c) { return match(c, a); }).length > 0;
                        var bMatch = cardNeighbors(_this.state.board, b).filter(function (c) { return match(c, b); }).length > 0;
                        return aMatch; // || bMatch
                    };
                    if (match(selected, card)) {
                        // solved = valid move
                        if (_this.props.onMatch) {
                            _this.props.onMatch(card.flashcard);
                        }
                        setTimeout(function () {
                            _this.setState({
                                board: _this.solveCards(_this.state.board, selected, card)
                            });
                            setTimeout(function () {
                                _this.setState({
                                    board: _this.shakeBoard(_this.state.board, [selected, card]),
                                    processing: false,
                                    selected: null,
                                    lastMatch: selected.flashcard,
                                    score: _this.state.score + 20
                                });
                            }, 250);
                        }, 100);
                    }
                    else if (couldHaveMatched(selected, card)) {
                        // could have solved = invalid move
                        if (_this.props.onMiss) {
                            _this.props.onMiss(selected.flashcard);
                        }
                        // reverse the swap                
                        setTimeout(function () {
                            _this.setState({
                                board: _this.swapCards(_this.state.board, selected, card),
                                processing: false,
                                selected: selected,
                                score: _this.state.score - 20
                            });
                        }, 100);
                    }
                    else {
                        // swap = valid move
                        _this.setState({
                            board: _this.state.board,
                            processing: false,
                            selected: selected
                        });
                    }
                }, 200);
            };
            // first animate the swap of the two cards regardless of whether it's a valid move or not        
            this.setState({
                board: this.swapCards(this.state.board, selected, card),
                processing: true,
                selected: selected
            });
        };
        SwapBoard.prototype.shakeBoard = function (board, solved) {
            board = board.slice();
            var minY = Math.min.apply(this, solved.map(function (c) { return c.y; }));
            var maxY = Math.max.apply(this, solved.map(function (c) { return c.y; }));
            var xs = solved.map(function (c) { return c.x; });
            board.forEach(function (c) {
                if (!c.solved && xs.indexOf(c.x) >= 0 && c.y < maxY) {
                    c.y += (1 + maxY - minY);
                }
            });
            this.closeGaps(board);
            if (board.filter(function (c) { return !c.solved; }).length == 0 && this.props.onFinished) {
                this.props.onFinished();
            }
            return board;
        };
        SwapBoard.prototype.closeGaps = function (board, again) {
            if (again === void 0) { again = true; }
            // look for horizontal gaps
            var _loop_3 = function(col) {
                var prev = col > 0 ? board.filter(function (c) { return c.x == col - 1 && !c.solved; }).length : 0;
                var cur = board.filter(function (c) { return c.x == col && !c.solved; }).length;
                var next = col < this_1.props.size - 1 ? board.filter(function (c) { return c.x == col + 1 && !c.solved; }).length : 0;
                if (cur == 0) {
                    if (col < this_1.props.size / 2) {
                        board.filter(function (c) { return c.x < col && !c.solved; }).forEach(function (c) { return c.x = c.x + 1; });
                    }
                    else {
                        board.filter(function (c) { return c.x > col && !c.solved; }).forEach(function (c) { return c.x = c.x - 1; });
                    }
                }
            };
            var this_1 = this;
            for (var col = 0; col < this.props.size; col++) {
                _loop_3(col);
            }
            if (again) {
                this.closeGaps(board, false);
            }
            return board;
        };
        SwapBoard.prototype.onMouseDown = function (card, e) {
            var selected = this.state.selected;
            // disabled swap on tap for now because it's not working right
            if (selected && false) {
                var dist = Math.sqrt(Math.pow(card.x - selected.x, 2) + Math.pow(card.y - selected.y, 2));
                if (dist == 1) {
                    this.trySwap(card, selected);
                    return;
                }
            }
            // select the new card
            this.setState({
                board: this.state.board,
                selected: card
            });
            this.dragStartXY = { x: e.clientX, y: e.clientY };
        };
        SwapBoard.prototype.onTouchMove = function (e) {
            e.preventDefault();
            if (e.touches.length > 0) {
                this.onMouseMove(e.touches[0]);
            }
        };
        SwapBoard.prototype.onMouseMove = function (e) {
            if (this.state.selected == null || this.dragStartXY == null)
                return;
            var dx = e.clientX - this.dragStartXY.x;
            var dy = e.clientY - this.dragStartXY.y;
            var length = Math.sqrt(dx * dx + dy * dy);
            if (length > 20) {
                var dir_1 = Math.abs(dx) > Math.abs(dy) ? { x: math_1.sign(dx), y: 0 } : { x: 0, y: math_1.sign(dy) };
                if (dir_1.x == 0 && dir_1.y == 0)
                    return;
                var selected_1 = this.state.selected;
                var swap = this.state.board.filter(function (c) { return !c.solved && c.x == selected_1.x + dir_1.x && c.y == selected_1.y + dir_1.y; })[0];
                if (swap) {
                    this.trySwap(swap, selected_1);
                }
            }
        };
        SwapBoard.prototype.onTouchEnd = function (e) {
            this.onMouseUp(e.targetTouches[0]);
        };
        SwapBoard.prototype.onCardTouchEnd = function (card, e) {
            this.onCardMouseUp(card, e.targetTouches[0]);
        };
        SwapBoard.prototype.onMouseUp = function (e) {
            this.dragStartXY = null;
        };
        SwapBoard.prototype.onCardMouseUp = function (card, e) {
            this.dragStartXY = null;
        };
        return SwapBoard;
    }(React.Component));
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = SwapBoard;
    function cardStyle(card, selected) {
        if (selected === void 0) { selected = false; }
        return {
            transform: transform(card.x * 100, card.y * 100, selected ? 2 : 1, card.solved ? 0 : 1)
        };
    }
    var Card = (function (_super) {
        __extends(Card, _super);
        function Card() {
            _super.apply(this, arguments);
        }
        Card.prototype.render = function () {
            var _this = this;
            var props = this.props;
            var card = props.card;
            var className = "Card" + (props.card.solved ? " solved" : "") + (props.selected ? " selected" : "");
            return React.createElement("div", {className: className, style: cardStyle(card, this.props.selected), onMouseDown: function (e) { return props.onMouseDown(card, e); }, onMouseUp: function (e) { return props.onMouseUp(card, e); }, onTouchStart: function (e) { return _this.onTouchStart(e); }, onTouchEnd: function (e) { return _this.onTouchEnd(e); }, onTouchCancel: function (e) { return _this.onTouchEnd(e); }}, card.flipped ? card.flashcard.translation : card.flashcard.text);
        };
        Card.prototype.onTouchStart = function (e) {
            if (e.touches.length > 0) {
                this.props.onMouseDown(this.props.card, e.touches[0]);
            }
        };
        Card.prototype.onTouchEnd = function (e) {
            if (e.changedTouches.length > 0) {
                this.props.onMouseUp(this.props.card, e.changedTouches[0]);
            }
        };
        return Card;
    }(React.Component));
    function cardNeighbors(board, cur) {
        return board.filter(function (c) { return !c.solved && ((Math.abs(c.x - cur.x) == 1 && c.y == cur.y) || (Math.abs(c.y - cur.y) == 1 && c.x == cur.x)); });
    }
    function cardNeighborsAt(board, xy) {
        return board.filter(function (c) { return !c.solved && ((Math.abs(c.x - xy.x) == 1 && c.y == xy.y) || (Math.abs(c.y - xy.y) == 1 && c.x == xy.x)); });
    }
    function transform(x, y, z, scale) {
        if (z === void 0) { z = 1; }
        if (scale === void 0) { scale = 1; }
        return "translate3d(" + x + "px, " + y + "px, " + z + "px) scale(" + scale + ")";
    }
});
define("components/StackSelect", ["require", "exports", "react", "store/store"], function (require, exports, React, store_1) {
    "use strict";
    /**
     * Component for selecting the stack of cards to practise
     */
    var StackSelect = (function (_super) {
        __extends(StackSelect, _super);
        function StackSelect() {
            _super.apply(this, arguments);
        }
        StackSelect.prototype.render = function () {
            var _this = this;
            return React.createElement("div", {className: "StackSelect"}, React.createElement("header", {className: "Card"}, "Select Sets"), Object.keys(this.props.stacks).map(function (key) { return React.createElement(StackCard, {key: key, stackName: key, cards: _this.props.stacks[key], selected: _this.props.selectedStacks.indexOf(key) >= 0, onStackSelection: _this.props.onStackSelection}); }), React.createElement("footer", {className: "Card"}, React.createElement("button", {onClick: function () { return _this.props.onStartPressed(_this.props.selectedStacks); }}, "Start Practice")));
        };
        return StackSelect;
    }(React.Component));
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = StackSelect;
    var StackCard = (function (_super) {
        __extends(StackCard, _super);
        function StackCard() {
            _super.apply(this, arguments);
        }
        StackCard.prototype.render = function () {
            var _this = this;
            var className = "StackCard Card" + (this.props.selected ? " selected" : "");
            var confidence = (this.props.cards.map(function (c) { return store_1.getProgress(_this.props.stackName, c.text); }).reduce(function (sum, p) { return sum + p; }) / this.props.cards.length).toFixed(1);
            return React.createElement("div", {className: className, onMouseDown: function (e) { return _this.onClick(e); }}, React.createElement("label", null, this.props.stackName), React.createElement("span", {className: "confidence"}, this.progressBar(confidence)));
        };
        StackCard.prototype.progressBar = function (progress) {
            var style = {
                width: progress + "%",
                backgroundColor: this.progressToColor(progress)
            };
            return React.createElement("div", {className: "progress-bar"}, React.createElement("span", {className: "percent"}, progress, "%"), React.createElement("div", {className: "bar", style: style}));
        };
        StackCard.prototype.progressToColor = function (percent) {
            if (percent == 100)
                return "#69db5e";
            else if (percent >= 80)
                return "#99db5e";
            else if (percent >= 60)
                return "#c2db5e";
            else if (percent >= 40)
                return "#dbd15e";
            else if (percent >= 20)
                return "#dba15e";
            else
                return "#db695e";
        };
        StackCard.prototype.onClick = function (e) {
            this.props.onStackSelection(this.props.stackName, !this.props.selected);
        };
        return StackCard;
    }(React.Component));
});
define("components/GameOver", ["require", "exports", "react", "store/store"], function (require, exports, React, store_2) {
    "use strict";
    var GameOver = (function (_super) {
        __extends(GameOver, _super);
        function GameOver(props) {
            _super.call(this, props);
            this.state = {
                showBefore: true
            };
        }
        GameOver.prototype.componentDidMount = function () {
            var _this = this;
            setTimeout(function () {
                _this.setState({
                    showBefore: false
                });
                setTimeout(function () {
                    $(".GameOver .results").animate({ scrollTop: $(".stats").height() }, 3000);
                }, 1500);
            }, 500);
            $(".GameOver .results").scrollTop(0);
        };
        GameOver.prototype.abortScroll = function () {
            $(".GameOver .results").stop();
        };
        GameOver.prototype.render = function () {
            var _this = this;
            return React.createElement("div", {className: "GameOver"}, React.createElement("div", {className: "results", onMouseDown: function () { return _this.abortScroll(); }}, React.createElement("div", {className: "stats"}, this.stats(), React.createElement("a", {name: "end"}))), React.createElement("footer", null, React.createElement("div", null, React.createElement("button", {onClick: function () { return _this.props.onBack(); }}, React.createElement("img", {src: "images/arrow_left_alt.png", height: "28", width: "28"}), " go back")), React.createElement("div", null, React.createElement("button", {onClick: function () { return _this.props.onPlay(); }}, React.createElement("img", {src: "images/reload.png", height: "28", width: "28"}), "  play again"))));
        };
        GameOver.prototype.stats = function () {
            var _this = this;
            var progress = this.props.progress;
            return Object.keys(progress).map(function (p) { return progress[p]; }).sort(function (a, b) { return store_2.getProgress(a.stack, a.text) - store_2.getProgress(b.stack, b.text); }).map(function (p) {
                var now = Math.min(100, store_2.getProgress(p.stack, p.text));
                var before = Math.max(0, now - p.progress);
                var style = {
                    width: (_this.state.showBefore ? before : now) + "%",
                    backgroundColor: _this.progressToColor(before)
                };
                return React.createElement("div", {className: "stat"}, React.createElement("label", null, p.text), React.createElement("div", {className: "progress"}, React.createElement("div", {className: "progress-bar"}, React.createElement("span", {className: "percent"}, _this.state.showBefore ? before : now, "%"), React.createElement("div", {className: "bar", style: style}))));
            });
        };
        GameOver.prototype.progressToColor = function (percent) {
            if (percent == 100)
                return "#69db5e";
            else if (percent >= 80)
                return "#99db5e";
            else if (percent >= 60)
                return "#c2db5e";
            else if (percent >= 40)
                return "#dbd15e";
            else if (percent >= 20)
                return "#dba15e";
            else
                return "#db695e";
        };
        return GameOver;
    }(React.Component));
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = GameOver;
});
/// <reference path="../lib/typings/react/react.d.ts"/>
/// <reference path="../lib/typings/react/react-dom.d.ts"/>
define("app", ["require", "exports", "react", "react-dom", "components/SwapBoard", "store/store", "components/StackSelect", "util/math", "components/GameOver", "buzz"], function (require, exports, React, ReactDOM, SwapBoard_1, store_3, StackSelect_1, math_2, GameOver_1, buzz) {
    "use strict";
    var sounds = {
        miss: new buzz.sound("sounds/bell.ogg"),
        match: new buzz.sound("sounds/coins.ogg"),
        finish: new buzz.sound("sounds/success.ogg")
    };
    var App = (function (_super) {
        __extends(App, _super);
        function App() {
            _super.apply(this, arguments);
            this.state = {
                progressed: {},
                gameover: false
            };
        }
        App.prototype.render = function () {
            var _this = this;
            var props = this.props;
            switch (props.view) {
                case "StackSelect":
                    return React.createElement(StackSelect_1.default, {stacks: props.stacks, selectedStacks: props.selectedStacks, onStackSelection: this.onStackSelection.bind(this), onStartPressed: this.onStart.bind(this)});
                case "SwapGame":
                    return React.createElement("div", {className: this.state.gameover ? "GameFrame gameover" : "GameFrame"}, React.createElement("div", {className: this.state.gameover ? "show GameOverWrapper" : "GameOverWrapper"}, this.state.gameover ? React.createElement(GameOver_1.default, {onBack: function () { return _this.onBack(); }, onPlay: function () { return _this.onPlayAgain(); }, progress: this.state.progressed}) : null), React.createElement(SwapBoard_1.default, {cards: props.cards, size: 6, onBack: function () { return _this.onBack(); }, onMiss: function (card) { return _this.onMiss(card); }, onMatch: function (card) { return _this.onMatch(card); }, onFinished: function () { return _this.onFinished(); }}));
            }
        };
        App.prototype.onBack = function () {
            this.setState({
                progressed: {},
                gameover: false
            });
            store_3.updateStore({
                view: "StackSelect"
            });
            store_3.persist();
        };
        App.prototype.onMiss = function (card) {
            var progressed = this.state.progressed;
            var record = progressed[(card.stack + "." + card.text)] || { stack: card.stack, text: card.text, progress: 0 };
            record.progress = Math.max(0, record.progress - 30);
            progressed[(card.stack + "." + card.text)] = record;
            this.setState({ progressed: progressed });
            sounds.miss.play();
        };
        App.prototype.onMatch = function (card) {
            var progressed = this.state.progressed;
            var record = progressed[(card.stack + "." + card.text)] || { stack: card.stack, text: card.text, progress: 0 };
            record.progress = Math.min(100, record.progress + 15);
            progressed[(card.stack + "." + card.text)] = record;
            this.setState({ progressed: progressed });
            sounds.match.play();
        };
        App.prototype.onFinished = function () {
            sounds.finish.play();
            // update the progress
            var progressed = this.state.progressed;
            var update = [];
            for (var key in progressed) {
                var entry = progressed[key];
                var progress = Math.max(0, Math.min(100, store_3.getProgress(entry.stack, entry.text) + entry.progress));
                update.push({ stackName: entry.stack, cardText: entry.text, progress: progress });
            }
            store_3.updateProgress(update);
            this.setState({
                progressed: this.state.progressed,
                gameover: true
            });
            store_3.persist();
            //this.setState({progressed: {}})
            //updateStore({
            //    view: "StackSelect"
            //})                
        };
        App.prototype.onPlayAgain = function () {
            var _this = this;
            this.setState({
                progressed: {},
                gameover: false
            });
            setTimeout(function () {
                _this.onStart(store_3.getStore().selectedStacks);
            }, 300);
        };
        App.prototype.onStart = function (selectedStacks) {
            var _this = this;
            // select random cards from sets
            var pool = math_2.shuffle(math_2.flatten(selectedStacks.map(function (name) { return _this.props.stacks[name]; })));
            // mostly prefer cards with lower confidence (cards which need to be practiced)
            var sorted = pool.sort(function (a, b) {
                var progressA = store_3.getProgress(a.stack, a.text);
                var progressB = store_3.getProgress(b.stack, b.text);
                return progressA - progressB;
            });
            var leastConfident = sorted.slice(0, 18);
            var restPool = sorted.length > 18 ? sorted.slice(18).sort(function (a, b) { return Math.random() >= 0.5 ? 1 : -1; }) : [];
            var selection = [];
            while (selection.length < Math.min(18, pool.length)) {
                var select = null;
                if (restPool.length == 0 || Math.random() > 0.75) {
                    select = (leastConfident.shift());
                }
                else {
                    select = (restPool.shift());
                }
                if (selection.filter(function (s) { return s.translation == select.translation; }).length > 0) {
                    continue;
                }
                selection.push(select);
            }
            store_3.updateStore({
                cards: selection,
                view: "SwapGame"
            });
        };
        App.prototype.onStackSelection = function (stackName, selected) {
            var selectedStacks = selected ? this.props.selectedStacks.concat([stackName]) : this.props.selectedStacks.filter(function (s) { return s != stackName; });
            console.log(selectedStacks);
            if (selectedStacks.length > 0) {
                store_3.updateStore({ selectedStacks: selectedStacks });
                store_3.persist();
            }
        };
        return App;
    }(React.Component));
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = App;
    store_3.onStoreChanged(function (update) {
        ReactDOM.render(React.createElement("div", {className: "App"}, React.createElement(App, React.__spread({}, update))), document.getElementById("root"));
    });
    store_3.restore();
});
define("components/ProgressTable", ["require", "exports", "react"], function (require, exports, React) {
    "use strict";
    var ProgressTable = (function (_super) {
        __extends(ProgressTable, _super);
        function ProgressTable() {
            _super.apply(this, arguments);
        }
        ProgressTable.prototype.render = function () {
            return React.createElement("div", {className: "ProgressTable"});
        };
        return ProgressTable;
    }(React.Component));
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = ProgressTable;
});
//# sourceMappingURL=app.js.map