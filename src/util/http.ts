module http {
    export function get(url, then) {
        const xhr = new XMLHttpRequest()
        xhr.onreadystatechange = function() {
            if (xhr.status == 200 && xhr.readyState == 4) {                
                if (url.indexOf("json") > 0) {                              
                    then(JSON.parse(xhr.responseText))
                } else {
                    then(xhr.responseText)
                }
            }
        }
        xhr.open("GET", url)
        xhr.send()
    }
}

export default http