const url = require('url')

function isCustomStrategy (path) {
    return !SUPPORTED_SELECTORS.includes(
        path.value.arguments[0].callee.property.name
    )
}

class TransformError extends Error {
    constructor(message, expr, file) {
        const source = file.source.split('\n')
        const line = source.slice(expr.loc.start.line - 1, expr.loc.end.line)[0]
        const expression = line.slice(0, expr.loc.end.column)
        const errorMsg = `Error transforming ${file.path.replace(process.cwd(), '')}:${expr.loc.start.line}`
        super(errorMsg)
        this.stack = (
            errorMsg + '\n\n' +
            `> ${expression}\n` +
            ' '.repeat(expr.loc.start.column + 2) + '^\n\n' +
            message + '\n' +
            `  at ${file.path}:${expr.loc.start.line}:${expr.loc.start.column}`
        )
        this.name = this.constructor.name
    }
}

function getSelectorArgument (j, path, callExpr, file) {
    const args = []
    const bySelector = callExpr.callee.property.name

    if (bySelector === 'id') {
        args.push(j.literal(`#${callExpr.arguments[0].value}`))
    } else if (bySelector === 'model') {
        args.push(j.literal(`*[ng-model="${callExpr.arguments[0].value}"]`))
    } else if (bySelector === 'css') {
        args.push(...callExpr.arguments)
    } else if (bySelector === 'cssContainingText') {
        const selector = callExpr.arguments[0]
        const text = callExpr.arguments[1]

    if (text.type === 'Literal') {
        args.push(j.literal(`${selector.value}=${text.value}`))
    } else if (text.type === 'Identifier') {
        args.push(
            j.binaryExpression(
                '+',
                j.literal(selector.value + '='),
                j.identifier(text.name)
            )
        )
    } else {
        throw new TransformError('expect 2nd parameter of cssContainingText to be a literal or identifier', path.value, file)
    }

    if (text.regex) {
        throw new TransformError('this codemod does not support RegExp in cssContainingText', path.value, file)
    }
    } else if (bySelector === 'binding') {
        throw new TransformError('Binding selectors (by.binding) are not supported, please consider refactor this line', path.value, file)
    } else {
        // we assume a custom locator strategy
        const selectorStrategyName = callExpr.callee.property.name
        const selector = callExpr.arguments[0].value
        args.push(
            j.literal(selectorStrategyName),
            j.literal(selector)
        )
    }

    return args
}

function matchesSelectorExpression (path) {
    return (
        path.value.arguments.length === 1 &&
        path.value.arguments[0].callee.type === 'MemberExpression' &&
        path.value.arguments[0].callee.object.name === 'by'
    )
}

function replaceCommands (prtrctrCommand) {
    switch (prtrctrCommand) {
        // element commands
        case 'sendKeys':
            return 'setValue'
        case 'isPresent':
            return 'isExisting'
        case 'getDriver':
            return 'parentElement'
        // browser commands
        case 'executeScript':
            return 'execute'
        case 'getPageSource':
            return 'getSource'
        case 'get':
            return 'url'
        case 'sleep':
            return 'pause'
        case 'enterRepl':
        case 'explore':
            return 'debug'
        case 'getCurrentUrl':
        case 'getLocationAbsUrl':
            return 'getUrl'
        case 'wait':
            return 'waitUntil'
        case 'close':
            return 'closeWindow'
        case 'restart':
        case 'restartSync':
            return 'reloadSession'
        case 'getAllWindowHandles':
            return 'getWindowHandles'
        default: return prtrctrCommand
    }
}

let remoteHostname = null
function parseConfigProperties (property) {
    const name = property.key.name || property.key.value
    const value = property.value.value
    if (name === 'seleniumAddress') {
        const u = url.parse(value)
        remoteHostname = u.hostname
        return [
            this.objectProperty(
                this.identifier('protocol'),
                this.stringLiteral(u.protocol.slice(0, -1))
            ),
            this.objectProperty(
                this.identifier('hostname'),
                this.stringLiteral(u.hostname)
            ),
            this.objectProperty(
                this.identifier('port'),
                this.literal(parseInt(u.port))
            ),
            this.objectProperty(
                this.identifier('path'),
                this.stringLiteral(u.path)
            )
        ]
    } else if (name === 'capabilities') {
        const { rootLevelConfigs, parsedCaps } = parseCapabilities.call(this, property.value.properties)
        return [
            ...rootLevelConfigs,
            this.objectProperty(
                this.identifier(name),
                this.arrayExpression([this.objectExpression(parsedCaps)])
            )
        ]
    }

    return property
}

function parseCapabilities (caps) {
    const rootLevelConfigs = []
    const parsedCaps = []

    for (const cap of caps) {
        const name = cap.key.name || cap.key.value
        if (name === 'name') {
            console.log('DOO WE', remoteHostname);
            if (!remoteHostname || (!remoteHostname.includes('browserstack') && !remoteHostname.includes('saucelabs'))) {
                console.log('AHH');
                continue
            }
            parsedCaps.push(
                this.objectProperty(
                    this.literal('sauce:options'),
                    this.objectExpression([
                        this.objectProperty(
                            this.identifier('name'),
                            this.literal(cap.value.value)
                        )
                    ])
                )
            )
        } else {
            parsedCaps.push(cap)
        }
    }

    return { rootLevelConfigs, parsedCaps }
}

module.exports = {
    isCustomStrategy,
    TransformError,
    getSelectorArgument,
    matchesSelectorExpression,
    replaceCommands,
    parseConfigProperties
}
