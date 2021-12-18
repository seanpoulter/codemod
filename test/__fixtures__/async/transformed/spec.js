const Login = require('./page');

describe('Test describe', () => {
    before(async () => {
        await Authenticate.login();
    });

    it('testing general commands', async () => {
        await $('.foo').click();
        await browser.pause(5000);
        await browser.waitUntil(async () => {
            return (await $('.bar').getText()) === 'foo';
        });

        const arr = await $$('.foo');

        await browser.execute(() => {
            $('.foo').click();
        });;

        await browser.execute(() => {
            document.querySelector('.foo').click();
            $('.foo').click();
        });;
    });

    it('testing loops', async () => {
        for (const num of [1, 2, 3]) {
            await $('.foo').setValue(num);
        };

        [
            1,
            2,
            3
        ].map(async num => {
            await $('.foo').setValue(num);
        });

        for (const {
            foo,
            bar
        } of [{
            foo : 123,
            bar : 456,
        }, {
            foo : 999,
            bar : 888,
        }]) {
            await $('.foo').setValue(foo);
            await $('.bar').setValue(bar);
        };

        for (const num of foo.bar) {
            await $('.bar').click();
        };

        for (const num of foo) {
            await $('.bar').setValue('aaa');
        };

        for (const foo of button_data) {
            checkAuthPage(true);
        };
    });
});

async function foo() {
    const bar = 123;
    await $('.foo').setValue(bar);
}
