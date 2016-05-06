export interface FlashCard {
    stack: string;
    text: string;
    translation: string;
}

export interface Store {
    stacks: {
        [name: string]: FlashCard[];  
    };
    progress: {
        [key: string]: number;
    };
    selectedStacks: string[];
    cards: FlashCard[];
    lastMatch?: FlashCard;
    view: "StackSelect" | "SwapGame";
}