
function calculateSeconds(days: number) {
    // Magic number 86400 (seconds in a day)
    return days * 86400;
}

function checkStatus(status: number) {
    // Magic number 418
    if (status === 418) {
        return "I'm a teapot";
    }
}

// These should be ignored
const MAX_RETRIES = 5;
const ZERO = 0;
const ONE = 1;

function retry() {
    // This magic number 5 should be flagged because it's not the constant
    for (let i = 0; i < 5; i++) {
        console.log(i);
    }
}
