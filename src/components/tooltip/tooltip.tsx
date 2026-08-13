import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import tippy, {Instance, Placement} from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/light.css';

const assignRef = <T,>(ref: React.Ref<T> | null | undefined, node: T | null) => {
    if (typeof ref === 'function') {
        ref(node);
    } else if (ref) {
        (ref as React.MutableRefObject<T | null>).current = node;
    }
};

export interface TooltipProps {
    content: React.ReactNode;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    popperOptions?: any;
    zIndex?: number;
    placement?: Placement;
    interactive?: boolean;
    theme?: string;
    appendTo?: Element | ((ref: Element) => Element);
    animation?: string;
    arrow?: boolean;
    children: React.ReactElement;
}

export const Tooltip = ({content, popperOptions, zIndex, placement, interactive = true, theme = 'light', appendTo = document.body, animation = 'fade', arrow, children}: TooltipProps) => {
    const child = React.Children.only(children) as React.ReactElement<{ref?: React.Ref<Element>}>;
    const [target, setTarget] = React.useState<Element | null>(null);
    const instanceRef = React.useRef<Instance | null>(null);
    const reactRootRef = React.useRef<ReactDOM.Root | null>(null);

    const setRef = React.useCallback(
        (node: Element | null) => {
            assignRef(child.props.ref, node);
            setTarget(node);
        },
        [child]
    );

    React.useEffect(() => {
        if (!target) {
            return;
        }

        const container = document.createElement('div');
        const reactRoot = ReactDOM.createRoot(container);
        reactRootRef.current = reactRoot;
        reactRoot.render(content);

        const instance = tippy(target, {
            content: container,
            theme,
            appendTo,
            animation,
            interactive,
            placement,
            zIndex,
            popperOptions,
            arrow
        });
        instanceRef.current = instance;

        return () => {
            instance.destroy();
            instanceRef.current = null;
            reactRootRef.current = null;
            queueMicrotask(() => reactRoot.unmount());
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target, placement, interactive, zIndex, popperOptions, theme, appendTo, animation, arrow]);

    React.useEffect(() => {
        if (reactRootRef.current) {
            reactRootRef.current.render(content);
        }
    }, [content]);

    return React.cloneElement(child, {ref: setRef});
};
