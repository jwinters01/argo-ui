import * as React from 'react';
import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import {Tooltip} from './tooltip';

jest.mock('tippy.js', () => {
    const tippy = jest.fn((target: Element, options: any) => {
        const contentNode: Element = typeof options.content === 'string' ? document.createElement('div') : options.content;
        if (typeof options.content === 'string') {
            contentNode.textContent = options.content;
        }

        const show = () => {
            if (!document.body.contains(contentNode)) {
                document.body.appendChild(contentNode);
            }
        };
        const hide = () => {
            if (document.body.contains(contentNode)) {
                document.body.removeChild(contentNode);
            }
        };

        target.addEventListener('mouseenter', show);
        target.addEventListener('mouseleave', hide);

        const instance = {
            destroy: jest.fn(() => {
                hide();
                target.removeEventListener('mouseenter', show);
                target.removeEventListener('mouseleave', hide);
            })
        };

        return instance;
    });

    return {__esModule: true, default: tippy};
});

describe('Tooltip', () => {
    test('renders and unmounts in StrictMode without React 19 element.ref warnings', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

        const {unmount} = render(
            <React.StrictMode>
                <Tooltip content='hello'>
                    <span>target</span>
                </Tooltip>
            </React.StrictMode>
        );

        await userEvent.hover(screen.getByText('target'));
        unmount();

        const badCall = errorSpy.mock.calls.find(call => call.some(arg => typeof arg === 'string' && (arg.includes('element.ref') || arg.includes('React 19'))));
        expect(badCall).toBeUndefined();

        errorSpy.mockRestore();
    });

    test('shows tooltip content on hover and hides on unhover', async () => {
        render(
            <Tooltip content='tooltip text'>
                <span>hover me</span>
            </Tooltip>
        );

        const target = screen.getByText('hover me');

        await userEvent.hover(target);
        await waitFor(() => expect(screen.getByText('tooltip text')).toBeInTheDocument());

        await userEvent.unhover(target);
        await waitFor(() => expect(screen.queryByText('tooltip text')).not.toBeInTheDocument());
    });

    test('accepts JSX content, not just strings', async () => {
        render(
            <Tooltip
                content={
                    <div className='custom-tooltip'>
                        <strong>bold</strong> content
                    </div>
                }>
                <span>hover me</span>
            </Tooltip>
        );

        await userEvent.hover(screen.getByText('hover me'));
        await waitFor(() => expect(screen.getByText('bold')).toBeInTheDocument());
    });

    test('passes placement, zIndex, and popperOptions straight through to tippy()', () => {
        const popperOptions = {
            modifiers: {
                preventOverflow: {enabled: true},
                hide: {enabled: false}
            }
        };

        render(
            <Tooltip content='x' placement='bottom' zIndex={9999} popperOptions={popperOptions}>
                <span>target</span>
            </Tooltip>
        );

        const tippyMock = jest.requireMock('tippy.js').default;
        expect(tippyMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                placement: 'bottom',
                zIndex: 9999,
                popperOptions
            })
        );
    });

    test('passes interactive, theme, appendTo, animation, and arrow straight through to tippy(), with defaults when omitted', () => {
        render(
            <Tooltip content='x'>
                <span>defaults</span>
            </Tooltip>
        );

        const tippyMock = jest.requireMock('tippy.js').default;
        expect(tippyMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                interactive: true,
                theme: 'light',
                appendTo: document.body,
                animation: 'fade'
            })
        );

        const container = document.createElement('div');
        render(
            <Tooltip content='x' interactive={false} theme='dark' appendTo={container} animation='shift-away' arrow={true}>
                <span>overrides</span>
            </Tooltip>
        );

        expect(tippyMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                interactive: false,
                theme: 'dark',
                appendTo: container,
                animation: 'shift-away',
                arrow: true
            })
        );
    });

    test('calls the tippy instance destroy() on unmount', () => {
        const {unmount} = render(
            <Tooltip content='x'>
                <span>target</span>
            </Tooltip>
        );

        const tippyMock = jest.requireMock('tippy.js').default;
        const instance = tippyMock.mock.results[tippyMock.mock.results.length - 1].value;

        unmount();

        expect(instance.destroy).toHaveBeenCalledTimes(1);
    });

    test('a child with its own forwardRef still receives the underlying DOM node', () => {
        const received: {node: HTMLElement | null} = {node: null};

        const Target = React.forwardRef<HTMLSpanElement>(function Target(_props, ref) {
            const localRef = React.useCallback(
                (node: HTMLSpanElement | null) => {
                    received.node = node;
                    if (typeof ref === 'function') {
                        ref(node);
                    } else if (ref) {
                        (ref as React.MutableRefObject<HTMLSpanElement | null>).current = node;
                    }
                },
                [ref]
            );
            return <span ref={localRef}>target</span>;
        });

        const outerRef = React.createRef<HTMLSpanElement>();

        render(
            <Tooltip content='x'>
                <Target ref={outerRef} />
            </Tooltip>
        );

        expect(received.node).not.toBeNull();
        expect(received.node).toBe(screen.getByText('target'));

        const tippyMock = jest.requireMock('tippy.js').default;
        expect(tippyMock).toHaveBeenCalledWith(received.node, expect.anything());
    });
});
