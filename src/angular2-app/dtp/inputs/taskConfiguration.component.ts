/*
 * This file is part of the INTO-CPS toolchain.
 *
 * Copyright (c) 2017-CurrentYear, INTO-CPS Association,
 * c/o Professor Peter Gorm Larsen, Department of Engineering
 * Finlandsgade 22, 8200 Aarhus N.
 *
 * All rights reserved.
 *
 * THIS PROGRAM IS PROVIDED UNDER THE TERMS OF GPL VERSION 3 LICENSE OR
 * THIS INTO-CPS ASSOCIATION PUBLIC LICENSE VERSION 1.0.
 * ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS PROGRAM CONSTITUTES
 * RECIPIENT'S ACCEPTANCE OF THE OSMC PUBLIC LICENSE OR THE GPL 
 * VERSION 3, ACCORDING TO RECIPIENTS CHOICE.
 *
 * The INTO-CPS toolchain  and the INTO-CPS Association Public License 
 * are obtained from the INTO-CPS Association, either from the above address,
 * from the URLs: http://www.into-cps.org, and in the INTO-CPS toolchain distribution.
 * GNU version 3 is obtained from: http://www.gnu.org/copyleft/gpl.html.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without
 * even the implied warranty of  MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE, EXCEPT AS EXPRESSLY SET FORTH IN THE
 * BY RECIPIENT SELECTED SUBSIDIARY LICENSE CONDITIONS OF
 * THE INTO-CPS ASSOCIATION.
 *
 * See the full INTO-CPS Association Public License conditions for more details.
 *
 * See the CONTRIBUTORS file for author and contributor information. 
 */

import { Component, Input, AfterContentInit, OnDestroy } from "@angular/core";
import { FormArray, FormGroup } from "@angular/forms";
import { Observable, Subscription } from "rxjs";
import { DataRepeaterDtpType, DTPConfig, DtpTypes, IDtpType, MaestroDtpType, ServerDtpType, SignalDtpType, TaskConfigurationDtpType, ToolDtpType } from "../../../intocps-configurations/dtp-configuration";

@Component({
    selector: 'task-configuration',
    templateUrl: "./angular2-app/dtp/inputs/taskConfiguration.component.html"
})
export class DtpTaskConfigurationComponent implements AfterContentInit, OnDestroy{
    private typesArrayChangedEventSubscription: Subscription;

    @Input()
    dtpType: TaskConfigurationDtpType

    @Input()
    formGroup: FormGroup;

    @Input()
    dtpTypes: IDtpType[];

    @Input()
    editing: boolean = false;

    @Input()
    typesArrayChangedEvent: Observable<void>;

    selectedTask: string;
    showSelectGroup: boolean;

    constructor() {
        console.log("Configuration component constructor");
    }

    typeFilterPredicate = (idtpType:IDtpType) => { return idtpType.type == DtpTypes.DataRepeaterDtpType || idtpType.type == DtpTypes.MaestroDtpType}

    ngAfterContentInit(): void {
        this.typesArrayChangedEventSubscription = this.typesArrayChangedEvent.subscribe(() => this.syncTasksWithTypes());
        this.updateSelectedTask();
    }

    ngOnDestroy() {
        this.typesArrayChangedEventSubscription.unsubscribe();
    }

    updateSelectedTask() {
        this.selectedTask = this.getRemaningTasksNames()[0] ?? "";
        this.showSelectGroup = this.selectedTask != "";
    }

    syncTasksWithTypes() {
        const indeciesToRemove = this.dtpType.tasks.reduce((indecies, task) => {
            if (!this.dtpTypes.includes(task)) {
                const index = this.dtpType.tasks.findIndex(task2 => task2.name == task.name && task2.type == task.type);
                if(index >= 0){
                    indecies.push(index);
                }
            }
            return indecies;
        }, []);

        for (var i = indeciesToRemove.length -1; i >= 0; i--){
            this.dtpType.tasks.splice(indeciesToRemove[i], 1);
        }
        this.updateSelectedTask();
    }

    getRemaningTasksNames(): string[] {
        const tasks = this.dtpTypes.reduce((tasks: string[], idtpType) => {
            if (!this.dtpType.tasks.includes(idtpType) && this.typeFilterPredicate(idtpType)) {
                tasks.push(this.getTaskName(idtpType));
            }
            return tasks;
        }, []);
        return tasks.sort();
    }

    addTask() {
        const task = this.dtpTypes.find(type => this.getTaskName(type) == this.selectedTask);
        this.dtpType.tasks.push(task);
        this.updateSelectedTask();
    }

    removeTask(task: IDtpType) {
        const index = this.dtpType.tasks.indexOf(task, 0);
        if (index > -1) {
            this.dtpType.tasks.splice(index, 1);
        }
        this.updateSelectedTask();
    }

    getTaskName(dtpType: IDtpType): string {
        var typeName: string = "";
        if (dtpType instanceof MaestroDtpType) {
            typeName = "Maestro"
        }
        else if (dtpType instanceof ServerDtpType) {
            typeName = "Server"
        }
        else if (dtpType instanceof SignalDtpType) {
            typeName = "Signal"
        }
        else if (dtpType instanceof DataRepeaterDtpType) {
            typeName = "Data-Repeater"
        }
        else if (dtpType instanceof ToolDtpType) {
            typeName = "Tool"
        }
        else if (dtpType instanceof TaskConfigurationDtpType) {
            typeName = "Configuration"
        }
        else {
            console.log("Unknown DTPType");
        }
        return typeName + "_" + dtpType.name;
    }
}