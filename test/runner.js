const fs = require('fs')
const path = require('path')
const shell = require('shelljs')
const expect = require('expect').default

const Runner = require('jscodeshift/src/Runner')

const supportedParsers = ['babel', 'tsx']
const frameworkTests = {
    protractor: [
        ['./conf.js', './conf.js'],
        ['./spec.js', './spec.js'],
        ['./element.js', './element.js'],
        ['./locators.js', './locators.js'],
        ['./class.js', './class.js'],
        ['./failing_byBinding.js'],
        ['./failing_byCssContainingTextRegex.js'],
        ['./failing_touchActions.js'],
        ['./failing_actions.js'],
        ['./failing_setLocation.js'],
        ['./failing_unsupported.js'],
        ['./failing_evaluate.js'],
        ['./failing_getCssValue.js'],
        ['./failing_selector.js'],
        ['./failing_submit.js'],
        ['./failing_clone.js'],
        ['./failing_column.js'],
        ['./failing_anythingProtractor.js'],
        ['./failing_constructor.js']
    ],
    v7: [
        ['./spec.js', './spec.js'],
        ['./compilerFunctions.js', './compilerFunctions.js']
    ],
    v6: [
        ['./spec.js', './spec.js'],
        ['./conf.js', './conf.js']
    ],
    async: [
        ['./spec.js', './spec.js'],
        ['./page.js', './page.js'],
        ['./steps.js', './steps.js']
    ]
}

let error

async function runTest (framework, tests, parser = 'babel') {
    shell.cp(
        '-r',
        path.join(__dirname, '__fixtures__', framework, 'source'),
        path.join(__dirname, 'testdata')
    )
    for ([source, desired] of tests) {
        const srcFile = path.join(__dirname, 'testdata', source)

        const result = await Runner.run(
            path.resolve(path.join(__dirname, '..', framework, 'index.js')),
            [srcFile],
            {
                verbose: 2,
                parser,
                printOptions : {
                    lineTerminator: '\n'
                }
            }
        )

        if (result.error) {
            if (desired) {
                throw new Error(`Failed to compile ${source} to ${desired}`)
            }

            continue
        }

        const sourceFileContent = (await fs.promises.readFile(srcFile)).toString()
        if (!desired) {
            throw new Error(`File ${srcFile} was suppose to fail but transformed successfully:\n${sourceFileContent}`)
        }

        const fixtureFile = path.join(__dirname, '__fixtures__', framework, 'transformed', desired)
        const desiredFileContent = (await fs.promises.readFile(fixtureFile)).toString()

        expect(sourceFileContent).toEqual(desiredFileContent)
    }
}

;(async () => {
    const teardown = () => shell.rm('-r', path.join(__dirname, 'testdata'))
    const testsToRun = process.argv.length === 3 && Object.keys(frameworkTests).includes(process.argv[2])
        ? { [process.argv[2]]: frameworkTests[process.argv[2]] }
        : frameworkTests
    const parserToRun = process.argv.length === 3 && supportedParsers.includes(process.argv[2])
        ? [process.argv[2]]
        : supportedParsers
    for (const [framework, tests] of Object.entries(testsToRun)) {
        for (const parser of parserToRun) {
            console.log('================================================')
            console.log(`Run tests for ${framework} using ${parser} parser`)
            console.log('================================================\n')
            await runTest(framework, tests, parser).finally(teardown)
        }
    }
})().then(
    () => console.log('Tests passed ✅'),
    (err) => (error = err)
).then(() => {
    if (error) {
        delete error.matcherResult
        console.warn(error)
        return process.exit(1)
    }
})
