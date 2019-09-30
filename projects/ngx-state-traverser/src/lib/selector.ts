import { createFeatureSelector, createSelector, select, Store } from '@ngrx/store';
import { TraversingState, TraversingStateFeatures } from './state';
import { Target } from 'angular-traversal';
import { map, filter, tap } from 'rxjs/operators';
import { TraverserActions } from './actions';
import { Observable } from 'rxjs';

export namespace TraverserSelectors {
    export class Missing {
        path: string;

        constructor(path: string) {
            this.path = path;
        }
    }

    type ContextOrMissing = { [key: string]: any } | Missing;

    function _getParentPath(state: TraversingState): string {
        let targetPath = state.target.contextPath;
        if (targetPath.endsWith('/')) {
            targetPath = targetPath.slice(0, -1);
        }
        return targetPath.split('/').slice(0, -1).join('/');
    }

    export const traversalSelector = createFeatureSelector<TraversingState>(
        TraversingStateFeatures.Traversal
    );

    export const getTarget = createSelector(
        traversalSelector,
        (state: TraversingState): Target => state.target
    );

    export const getContextPath = createSelector(
        traversalSelector,
        (state: TraversingState): string => state.target.contextPath
    );

    export const getPrefixedContextPath = createSelector(
        traversalSelector,
        (state: TraversingState): string => state.target.prefixedContextPath
    );

    export const getPath = createSelector(
        traversalSelector,
        (state: TraversingState): string => state.target.path
    );

    export const getPrefixedPath = createSelector(
        traversalSelector,
        (state: TraversingState): string => state.target.prefixedPath
    );

    export const getContext = createSelector(
        traversalSelector,
        (state: TraversingState): { [key: string]: any } => state.target.context
    );

    export function TraverserContext<T>(store: Store<any>) {
        return store.pipe(
            select(getContext),
            map(context => (context as T))
        );
    }

    export const getParentPath = createSelector(
        traversalSelector,
        (state: TraversingState): string => {
            return _getParentPath(state);
        }
    );

    export const getParent = createSelector(
        traversalSelector,
        (state: TraversingState): ContextOrMissing => {
            const parentPath = _getParentPath(state);
            return state.collection[parentPath] || new Missing(parentPath);
        }
    );

    export const getAncestors = createSelector(
        traversalSelector,
        (state: TraversingState, path: string): ContextOrMissing[] => {
            const ancestorPaths = path.split('/').filter(chunk => !!chunk).reduce((allChunks, chunk) => {
                if (allChunks.length === 0) {
                    allChunks.push(`/${chunk}`);
                } else {
                    allChunks.push(`${allChunks[allChunks.length - 1]}/${chunk}`);
                }
                return allChunks;
            }, [] as string[]);

            const ancestors: ContextOrMissing[] = ancestorPaths.map(ancestor => state.collection[ancestor] || new Missing(ancestor));
            return ancestors.filter(ancestor => !ancestor['isForbidden']);
        }
    );

    export function TraverseToAncestors<T>(store: Store<any>, path: string): Observable<(T | undefined)[]> {
        return store.pipe(
            select(getAncestors, path),
            tap(ancestors => ancestors.forEach(ancestor => {
                if (ancestor instanceof Missing) {
                    store.dispatch(new TraverserActions.Traverse(ancestor.path));
                }
            })),
            filter(ancestors => ancestors.every(ancestor => !(ancestor instanceof Missing) && !ancestor.isPending)),
            map(ancestors => ancestors as T[])
        );
    }

    export function TraverseToParent<T>(store: Store<any>) {
        return store.pipe(
            select(getParent),
            map(context => {
                if (context instanceof Missing) {
                    store.dispatch(new TraverserActions.Traverse(context.path));
                } else {
                    return (context as T);
                }
            })
        );
    }

    export function getObjectByPath(path: string) {
        return createSelector(
            traversalSelector,
            (state: TraversingState): ContextOrMissing => {
                if (path.startsWith('./')) {
                    path = state.target.contextPath + path.slice(1);
                } else if (path.startsWith('../')) {
                    const current = state.target.contextPath.split('/');
                    path = path.split('/').reduce((all, chunk) => {
                        if (chunk === '..') {
                            all.pop();
                        } else {
                            all.push(chunk);
                        }
                        return all;
                    }, current).join('/');
                }
                return state.collection[path] || new Missing(path);
            }
        );
    }

    export function TraverseTo<T>(store: Store<any>, path: string) {
        return store.pipe(
            select(getObjectByPath(path)),
            map(context => {
                if (context instanceof Missing) {
                    store.dispatch(new TraverserActions.Traverse(context.path));
                    return null;
                } else {
                    return context;
                }
            }),
            filter(context => !!context),
            map(context => (context as T))
        );
    }
}
