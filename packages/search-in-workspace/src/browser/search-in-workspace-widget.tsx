/********************************************************************************
 * Copyright (C) 2018 TypeFox and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { Widget, Message, BaseWidget, Key, StatefulWidget, MessageLoop } from "@theia/core/lib/browser";
import { inject, injectable, postConstruct } from "inversify";
import { SearchInWorkspaceResultTreeWidget } from "./search-in-workspace-result-tree-widget";
import { SearchInWorkspaceOptions } from "../common/search-in-workspace-interface";
import * as React from 'react';
import * as ReactDOM from 'react-dom';

export interface SearchFieldState {
    className: string;
    enabled: boolean;
    title: string;
}

@injectable()
export class SearchInWorkspaceWidget extends BaseWidget implements StatefulWidget {

    static ID = "search-in-workspace";
    static LABEL = "Search";

    protected matchCaseState: SearchFieldState;
    protected wholeWordState: SearchFieldState;
    protected regExpState: SearchFieldState;
    protected includeIgnoredState: SearchFieldState;

    protected showSearchDetails = false;
    protected hasResults = false;
    protected resultNumber = 0;

    protected searchFieldContainerIsFocused = false;

    protected searchInWorkspaceOptions: SearchInWorkspaceOptions;

    protected searchTerm = "";
    protected replaceTerm = "";

    protected showReplaceField = false;

    protected contentNode: HTMLElement;
    protected searchFormContainer: HTMLElement;
    protected resultContainer: HTMLElement;

    @inject(SearchInWorkspaceResultTreeWidget) protected readonly resultTreeWidget: SearchInWorkspaceResultTreeWidget;

    @postConstruct()
    init() {
        this.id = SearchInWorkspaceWidget.ID;
        this.title.label = SearchInWorkspaceWidget.LABEL;

        this.contentNode = document.createElement('div');
        this.contentNode.classList.add("t-siw-search-container");
        this.searchFormContainer = document.createElement('div');
        this.searchFormContainer.classList.add("searchHeader");
        this.contentNode.appendChild(this.searchFormContainer);
        this.node.appendChild(this.contentNode);

        this.matchCaseState = {
            className: "match-case",
            enabled: false,
            title: "Match Case"
        };
        this.wholeWordState = {
            className: "whole-word",
            enabled: false,
            title: "Match Whole Word"
        };
        this.regExpState = {
            className: "use-regexp",
            enabled: false,
            title: "Use Regular Expression"
        };
        this.includeIgnoredState = {
            className: "include-ignored fa fa-eye",
            enabled: false,
            title: "Include Ignored Files"
        };
        this.searchInWorkspaceOptions = {
            matchCase: false,
            matchWholeWord: false,
            useRegExp: false,
            includeIgnored: false,
            include: [],
            exclude: [],
            maxResults: 2000
        };
        this.toDispose.push(this.resultTreeWidget.onChange(r => {
            this.hasResults = r.size > 0;
            this.resultNumber = 0;
            const results = Array.from(r.values());
            results.forEach(result => this.resultNumber += result.children.length);
            this.update();
        }));

        this.toDispose.push(this.resultTreeWidget.onFocusInput(b => {
            this.focusInputField();
        }));
    }

    storeState(): object {
        return {
            matchCaseState: this.matchCaseState,
            wholeWordState: this.wholeWordState,
            regExpState: this.regExpState,
            includeIgnoredState: this.includeIgnoredState,
            showSearchDetails: this.showSearchDetails,
            searchInWorkspaceOptions: this.searchInWorkspaceOptions,
            searchTerm: this.searchTerm,
            replaceTerm: this.replaceTerm,
            showReplaceField: this.showReplaceField
        };
    }

    // tslint:disable-next-line:no-any
    restoreState(oldState: any): void {
        this.matchCaseState = oldState.matchCaseState;
        this.wholeWordState = oldState.wholeWordState;
        this.regExpState = oldState.regExpState;
        this.includeIgnoredState = oldState.includeIgnoredState;
        this.showSearchDetails = oldState.showSearchDetails;
        this.searchInWorkspaceOptions = oldState.searchInWorkspaceOptions;
        this.searchTerm = oldState.searchTerm;
        this.replaceTerm = oldState.replaceTerm;
        this.showReplaceField = oldState.showReplaceField;
        this.resultTreeWidget.replaceTerm = this.replaceTerm;
        this.resultTreeWidget.showReplaceButtons = this.showReplaceField;
        this.refresh();
    }

    findInFolder(uri: string): void {
        this.showSearchDetails = true;
        const value = `${uri}/**`;
        this.searchInWorkspaceOptions.include = [value];
        const include = document.getElementById("include-glob-field");
        if (include) {
            (include as HTMLInputElement).value = value;
        }
        this.update();
    }

    protected onAfterAttach(msg: Message) {
        super.onAfterAttach(msg);
        ReactDOM.render(<React.Fragment>{this.renderSearchHeader()}</React.Fragment>, this.searchFormContainer);
        Widget.attach(this.resultTreeWidget, this.contentNode);
    }

    protected onUpdateRequest(msg: Message) {
        super.onUpdateRequest(msg);
        ReactDOM.render(<React.Fragment>{this.renderSearchHeader()}</React.Fragment>, this.searchFormContainer);
    }

    protected onResize(msg: Widget.ResizeMessage): void {
        super.onResize(msg);
        MessageLoop.sendMessage(this.resultTreeWidget, Widget.ResizeMessage.UnknownSize);
    }

    protected onAfterShow(msg: Message) {
        this.focusInputField();
    }

    protected onActivateRequest(msg: Message) {
        super.onActivateRequest(msg);
        this.focusInputField();
    }

    protected focusInputField() {
        const f = document.getElementById("search-input-field");
        if (f) {
            (f as HTMLInputElement).focus();
            (f as HTMLInputElement).select();
        }
    }

    protected renderSearchHeader(): React.ReactNode {
        const controlButtons = this.renderControlButtons();
        const searchAndReplaceContainer = this.renderSearchAndReplace();
        const searchDetails = this.renderSearchDetails();
        return <div>{controlButtons}{searchAndReplaceContainer}{searchDetails}</div>;
    }

    protected refresh = () => {
        this.resultTreeWidget.search(this.searchTerm, this.searchInWorkspaceOptions);
        this.update();
    }

    protected collapseAll = () => {
        this.resultTreeWidget.collapseAll();
        this.update();
    }

    protected clear = () => {
        this.searchTerm = "";
        this.replaceTerm = "";
        this.searchInWorkspaceOptions.include = [];
        this.searchInWorkspaceOptions.exclude = [];
        this.includeIgnoredState.enabled = false;
        this.matchCaseState.enabled = false;
        this.wholeWordState.enabled = false;
        this.regExpState.enabled = false;
        const search = document.getElementById("search-input-field");
        const replace = document.getElementById("replace-input-field");
        const include = document.getElementById("include-glob-field");
        const exclude = document.getElementById("exclude-glob-field");
        if (search && replace && include && exclude) {
            (search as HTMLInputElement).value = "";
            (replace as HTMLInputElement).value = "";
            (include as HTMLInputElement).value = "";
            (exclude as HTMLInputElement).value = "";
        }
        this.resultTreeWidget.search(this.searchTerm, this.searchInWorkspaceOptions);
        this.update();
    }

    protected renderControlButtons(): React.ReactNode {
        const refreshButton = this.renderControlButton(`refresh${this.hasResults || this.searchTerm !== "" ? " enabled" : ""}`, 'Refresh', this.refresh);
        const collapseAllButton = this.renderControlButton(`collapse-all${this.hasResults ? " enabled" : ""}`, 'Collapse All', this.collapseAll);
        const clearButton = this.renderControlButton(`clear-all${this.hasResults ? " enabled" : ""}`, 'Clear', this.clear);
        return <div className="controls button-container">{refreshButton}{collapseAllButton}{clearButton}</div>;
    }

    protected renderControlButton(btnClass: string, title: string, clickHandler: () => void): React.ReactNode {
        return <span className={`btn ${btnClass}`} title={title} onClick={clickHandler}></span>;
    }

    protected renderSearchAndReplace(): React.ReactNode {
        const toggleContainer = this.renderReplaceFieldToggle();
        const searchField = this.renderSearchField();
        const replaceField = this.renderReplaceField();
        return <div className="search-and-replace-container">
            {toggleContainer}
            <div className="search-and-replace-fields">
                {searchField}
                {replaceField}
            </div>
        </div>;
    }

    protected renderReplaceFieldToggle(): React.ReactNode {
        const toggle = <span className={`fa fa-caret-${this.showReplaceField ? "down" : "right"}`}></span>;
        return <div
            className="replace-toggle"
            tabIndex={0}
            onClick={e => {
                const elArr = document.getElementsByClassName("replace-toggle");
                if (elArr && elArr.length > 0) {
                    (elArr[0] as HTMLElement).focus();
                }
                this.showReplaceField = !this.showReplaceField;
                this.resultTreeWidget.showReplaceButtons = this.showReplaceField;
                this.update();
            }}>
            {toggle}
        </div>;
    }

    protected renderNotification(): React.ReactNode {
        return <div
            className={`search-notification ${this.searchInWorkspaceOptions.maxResults && this.resultNumber >= this.searchInWorkspaceOptions.maxResults ? "show" : ""}`}>
            <div>
                This is only a subset of all results. Use a more specific search term to narrow down the result list.
            </div>
        </div>;
    }

    protected readonly focusSearchFieldContainer = () => this.doFocusSearchFieldContainer();
    protected doFocusSearchFieldContainer() {
        this.searchFieldContainerIsFocused = true;
        this.update();
    }
    protected readonly unfocusSearchFieldContainer = () => this.doUnfocusSearchFieldContainer();
    protected doUnfocusSearchFieldContainer() {
        this.searchFieldContainerIsFocused = false;
        this.update();
    }

    protected readonly handleKeyUp = (e: React.KeyboardEvent) => this.doHandleKeyUp(e);
    protected doHandleKeyUp(e: React.KeyboardEvent) {
        if (e.target) {
            if (Key.ARROW_DOWN.keyCode === e.keyCode) {
                this.resultTreeWidget.focusFirstResult();
            } else {
                this.searchTerm = (e.target as HTMLInputElement).value;
                this.resultTreeWidget.search(this.searchTerm, (this.searchInWorkspaceOptions || {}));
                this.update();
            }
        }
    }

    protected renderSearchField(): React.ReactNode {
        const input = <input
            id="search-input-field"
            type="text"
            size={1}
            placeholder="Search"
            defaultValue={this.searchTerm}
            onKeyUp={this.handleKeyUp}
        ></input>;
        const notification = this.renderNotification();
        const optionContainer = this.renderOptionContainer();
        const tooMany = this.searchInWorkspaceOptions.maxResults && this.resultNumber >= this.searchInWorkspaceOptions.maxResults ? "tooManyResults" : "";
        const className = `search-field-container ${tooMany} ${this.searchFieldContainerIsFocused ? 'focused' : ''}`;
        return <div className={className}>
            <div className="search-field" tabIndex={-1} onFocus={this.focusSearchFieldContainer} onBlur={this.unfocusSearchFieldContainer}>
                {input}
                {optionContainer}
            </div>
            {notification}
        </div>;
    }

    protected renderReplaceField(): React.ReactNode {
        const replaceAllButtonContainer = this.renderReplaceAllButtonContainer();
        return <div className={`replace-field${this.showReplaceField ? "" : " hidden"}`}>
            <input
                id="replace-input-field"
                type="text"
                size={1}
                placeholder="Replace"
                defaultValue={this.replaceTerm}
                onKeyUp={e => {
                    if (e.target) {
                        if (Key.ENTER.keyCode === e.keyCode) {
                            this.resultTreeWidget.search(this.searchTerm, (this.searchInWorkspaceOptions || {}));
                            this.update();
                        } else {
                            this.replaceTerm = (e.target as HTMLInputElement).value;
                            this.resultTreeWidget.replaceTerm = this.replaceTerm;
                        }
                    }
                }}>
            </input>
            {replaceAllButtonContainer}
        </div>;
    }

    protected renderReplaceAllButtonContainer(): React.ReactNode {
        return <div className="replace-all-button-container">
            <span
                className={`replace-all-button${this.searchTerm === "" ? " disabled" : ""}`}
                onClick={() => {
                    this.resultTreeWidget.replaceAll();
                }}>
            </span>
        </div>;
    }

    protected renderOptionContainer(): React.ReactNode {
        const matchCaseOption = this.renderOptionElement(this.matchCaseState);
        const wholeWordOption = this.renderOptionElement(this.wholeWordState);
        const regexOption = this.renderOptionElement(this.regExpState);
        const includeIgnoredOption = this.renderOptionElement(this.includeIgnoredState);
        return <div className="option-buttons">{matchCaseOption}{wholeWordOption}{regexOption}{includeIgnoredOption}</div>;
    }

    protected renderOptionElement(opt: SearchFieldState): React.ReactNode {
        return <span
            className={`${opt.className} option ${opt.enabled ? "enabled" : ""}`}
            title={opt.title}
            onClick={() => this.handleOptionClick(opt)}></span>;
    }

    protected handleOptionClick(option: SearchFieldState): void {
        option.enabled = !option.enabled;
        this.updateSearchOptions();
        this.searchFieldContainerIsFocused = true;
        this.resultTreeWidget.search(this.searchTerm, this.searchInWorkspaceOptions);
        this.update();
    }

    protected updateSearchOptions() {
        this.searchInWorkspaceOptions.matchCase = this.matchCaseState.enabled;
        this.searchInWorkspaceOptions.matchWholeWord = this.wholeWordState.enabled;
        this.searchInWorkspaceOptions.useRegExp = this.regExpState.enabled;
        this.searchInWorkspaceOptions.includeIgnored = this.includeIgnoredState.enabled;
    }

    protected renderSearchDetails(): React.ReactNode {
        const expandButton = this.renderExpandGlobFieldsButton();
        const globFieldContainer = this.renderGlobFieldContainer();
        return <div className="search-details">{expandButton}{globFieldContainer}</div>;
    }

    protected renderGlobFieldContainer(): React.ReactNode {
        const includeField = this.renderGlobField("include");
        const excludeField = this.renderGlobField("exclude");
        return <div className={`glob-field-container${!this.showSearchDetails ? " hidden" : ""}`}>{includeField}{excludeField}</div>;
    }

    protected renderExpandGlobFieldsButton(): React.ReactNode {
        return <div className="button-container">
            <span
                className="fa fa-ellipsis-h btn"
                onClick={() => {
                    this.showSearchDetails = !this.showSearchDetails;
                    this.update();
                }}></span>
        </div>;
    }

    protected renderGlobField(kind: "include" | "exclude"): React.ReactNode {
        const currentValue = this.searchInWorkspaceOptions[kind];
        const value = currentValue && currentValue.join(', ') || '';
        return <div className="glob-field">
            <div className="label">{"files to " + kind}</div>
            <input
                type="text"
                size={1}
                defaultValue={value}
                id={kind + "-glob-field"}
                onKeyUp={e => {
                    if (e.target) {
                        if (Key.ENTER.keyCode === e.keyCode) {
                            this.resultTreeWidget.search(this.searchTerm, this.searchInWorkspaceOptions);
                        } else {
                            this.searchInWorkspaceOptions[kind] = this.splitOnComma((e.target as HTMLInputElement).value);
                        }
                    }
                }}></input>
        </div>;
    }

    protected splitOnComma(patterns: string): string[] {
        return patterns.split(',').map(s => s.trim());
    }
}
