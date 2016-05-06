export function range(startIncl: number, endExcl: number, step: number = 1) {
    const items = []
    for (var i = startIncl; i < endExcl; i += step) {
        items.push(i)
    }
    return items
}

export function flatten<T>(items: T[][]): T[] {
    const flattened = []
    for (var i = 0; i < items.length; i++) {
        for (var j = 0; j < items[i].length; j++) {
            flattened.push(items[i][j])
        }
    }
    return flattened
}

export function shuffle<T>(array: T[]) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

export function sign(x: number): number {
    if (x < 0) return -1
    else if (x > 0) return 1
    else return 0
}