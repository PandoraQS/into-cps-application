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

import { FileSystemService } from "../shared/file-system.service";
import { SettingsService, SettingKeys } from "../shared/settings.service";
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Serializer } from "../../intocps-configurations/Parser";
import { Fmu } from "./models/Fmu";
import { CoeConfig } from "./models/CoeConfig";
import * as Path from "path";
import { BehaviorSubject } from "rxjs";
import { Injectable, NgZone } from "@angular/core";
import { CoSimulationConfig, LiveGraph } from "../../intocps-configurations/CoSimulationConfig";
import { storeResultCrc } from "../../intocps-configurations/ResultConfig";
import * as http from "http"
import * as fs from 'fs'
import * as child_process from 'child_process'
import DialogHandler from "../../DialogHandler"
import { Graph } from "../shared/graph"
import { Deferred } from "../../deferred"
import { CoeProcess } from "../../coe-server-status/CoeProcess"
import { IntoCpsApp } from "../../IntoCpsApp";
import { tap } from "rxjs/operators";


@Injectable()
export class CoeSimulationService {
    progress: number = 0;
    errorReport: (hasError: boolean, message: string, hasWarning?: boolean, stopped?: boolean) => void = function () { };
    simulationCompletedHandler: () => void = function () { };
    postProcessingOutputReport: (hasError: boolean, message: string) => void = function () { };

    private masterModel: string;
    private sessionId: string;
    private remoteCoe: boolean;
    private coe: CoeProcess; 
    private url: string;
    private resultDir: string;
    private config: CoSimulationConfig;
    private graphMaxDataPoints: number = 100;
    public graph: Graph = new Graph();
    public externalGraphs: Array<DialogHandler> = new Array<DialogHandler>();

    constructor(private http: HttpClient,
        private settings: SettingsService,
        private fileSystem: FileSystemService,
        private zone: NgZone) {

        this.graphMaxDataPoints = settings.get(SettingKeys.GRAPH_MAX_DATA_POINTS);
        this.graph.setProgressCallback((progress: number) => { this.progress = progress });
        this.graph.setGraphMaxDataPoints(this.graphMaxDataPoints);
    }

    reset() {
        this.progress = 0;
        this.zone.run(() => {
            this.graph.reset();
        });
    }

    openCOEServerStatusWindow(
        data: string = "",
        show: boolean = true
    ) {
        this.coe = IntoCpsApp.getInstance().getCoeProcess();
        if (!this.coe.isRunning()) IntoCpsApp.getInstance().getCoeProcess().start();
    }

    getResultsDir(): string {
        return this.resultDir;
    }

    runSigverSimulation(config: CoSimulationConfig, masterModel: string, resultsDir: string, errorReport: (hasError: boolean, message: string, hasWarning: boolean, stopped: boolean) => void, simCompleted: () => void, postScriptOutputReport: (hasError: boolean, message: string) => void) {
        this.config = config;
        this.masterModel = masterModel;
        this.resultDir = Path.normalize(`${resultsDir}/R_${this.getDateString()}`);
        this.initialize(errorReport, simCompleted, postScriptOutputReport).then(() => {
            const simulationData: any = {
                startTime: this.config.startTime,
                endTime: this.config.endTime,
                reportProgress: true,
                liveLogInterval: this.config.livestreamInterval,
                masterModel: this.masterModel
            };

            this.simulate("sigverSimulate", simulationData);
        }).catch(err => this.errorHandler(err));
    }

    runSimulation(config: CoSimulationConfig, errorReport: (hasError: boolean, message: string, hasWarning: boolean, stopped: boolean) => void, simCompleted: () => void, postScriptOutputReport: (hasError: boolean, message: string) => void) {
        this.config = config;
        const currentDir = Path.dirname(this.config.sourcePath);
        this.resultDir = Path.normalize(`${currentDir}/R_${this.getDateString()}`);
        this.initialize(errorReport, simCompleted, postScriptOutputReport).then(() => {
            const simulationData: any = {
                startTime: this.config.startTime,
                endTime: this.config.endTime,
                reportProgress: true,
                liveLogInterval: this.config.livestreamInterval
            };

            // enable logging for all log categories        
            const logCategories: any = new Object();
            let self = this;
            this.config.multiModel.fmuInstances.forEach(instance => {
                let key: any = instance.fmu.name + "." + instance.name;

                if (self.config.enableAllLogCategoriesPerInstance) {
                    logCategories[key] = instance.fmu.logCategories;
                }
            });
            Object.assign(simulationData, { logLevels: logCategories });

            this.simulate("simulate", simulationData);
        }).catch(err => this.errorHandler(err));
    }

    stop() {
        this.http.get(`http://${this.url}/stopsimulation/${this.sessionId}`)
            .subscribe((response: Response) => { }, (err: Response) => this.errorHandler(err, true));
    }

    errorHandler(err: Response, stopped?: boolean) {
        console.warn(err);
        if(stopped) {
            this.progress = 0;
            this.errorReport(false, "Error: " + err.statusText, true, true)
        } else if(!stopped && err.status == 200) {
            this.progress = 0;
            this.errorReport(false, "Error: " + err.statusText, true)
        } else {
            this.progress = 0;
            this.errorReport(true, "Error: " + err.statusText);
        }
    }

    private getDateString(): string {
        const now = new Date();
        const nowAsUTC = new Date(Date.UTC(now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            now.getHours(),
            now.getMinutes(),
            now.getSeconds(),
            now.getMilliseconds())
        );
        return nowAsUTC.toISOString().replace(/-/gi, "_")
        .replace(/T/gi, "-")
        .replace(/Z/gi, "")
        .replace(/:/gi, "_")
        .replace(/\./gi, "_");
    }

    private async initialize(errorReport: (hasError: boolean, message: string, hasWarning: boolean, stopped: boolean) => void, simCompleted: () => void, postScriptOutputReport: (hasError: boolean, message: string) => void): Promise<void> {
        this.coe = IntoCpsApp.getInstance().getCoeProcess();
        this.errorReport = errorReport;
        this.simulationCompletedHandler = simCompleted;
        this.postProcessingOutputReport = postScriptOutputReport;
        this.remoteCoe = this.settings.get(SettingKeys.COE_REMOTE_HOST);
        this.url = this.settings.get(SettingKeys.COE_URL);
        this.reset();
        this.graph.setCoSimConfig(this.config);
        this.graph.initializeDatasets();
        this.coe.prepareSimulation();
        return this.createSession().then(async sessionId => {
            this.sessionId = sessionId;
            if (this.remoteCoe) {
                await this.uploadFmus().catch(err => this.errorHandler(err));
            }
            return this.initializeCoe();
        });
    }

    private createSession(): Promise<string>  {
        return new Promise<string> ((resolve, reject) => {
            this.errorReport(false, "");
            this.http.get(`http://${this.url}/createSession`).subscribe((response: any) => resolve(response.sessionId), (err: Response) => reject(err));
        });
    }

    private uploadFmus(): Promise<void> {
        return new Promise<void> ((resolve, reject) => {
            let formData = new FormData();
    
            this.config.multiModel.fmus.forEach((value: Fmu) => {
                this.fileSystem.readFile(value.path).then(content => {
                    formData.append(
                        'file',
                        new Blob([content], { type: "multipart/form-data" }),
                        value.path
                    );
                });
            });
    
            this.http.post(`http://${this.url}/upload/${this.sessionId}`, formData)
                .subscribe(() => resolve(), (err: Response) => reject(err));
        });
        
    }

    private initializeCoe(): Promise<void> {
        return new Promise<void> ((resolve, reject) => {
            let data = new CoeConfig(this.config, this.remoteCoe).toJSON();

            this.fileSystem.mkdir(this.resultDir)
                .then(() => this.fileSystem.writeFile(Path.join(this.resultDir, "config.json"), data))
                .then(() => {
                    this.http.post(`http://${this.url}/initialize/${this.sessionId}`, data)
                        .subscribe(() => resolve(), (err: Response) => reject(err));
                });
        });
    }

    private simulate(simulationEndpoint: string, simulationData: any) {
        let deferreds = new Array<Promise<any>>();

        this.graph.graphMap.forEach((value: BehaviorSubject<any[]>, key: LiveGraph) => {
            if (key.externalWindow) {
                let deferred: Deferred<any> = new Deferred<any>();
                deferreds.push(deferred.promise);
                let graphObj = key.toObject();
                graphObj.webSocket = "ws://" + this.url + "/attachSession/" + this.sessionId;
                graphObj.graphMaxDataPoints = this.graphMaxDataPoints;
                console.log(graphObj);
                let dh = new DialogHandler("angular2-app/coe/graph-window/graph-window.html", 800, 600);
                dh.openWindow(JSON.stringify(graphObj), true);
                this.externalGraphs.push(dh);
                dh.win.webContents.on("did-finish-load", () => {
                    dh.win.setTitle("Plot: " + key.title);
                    deferred.resolve();
                });
            }
        });

        Promise.all(deferreds).then(() => {
            // Do not start the simulation before the websocket is open.
            this.graph.webSocketOnOpenCallback = () => this.fileSystem.writeFile(Path.join(this.resultDir, "config-simulation.json"), JSON.stringify(simulationData))
            .then(() => {
                this.http.post(`http://${this.url}/${simulationEndpoint}/${this.sessionId}`, simulationData)
                    .subscribe(() => {this.downloadResults(); this.graph.setFinished()}, (err: Response) => this.errorHandler(err));
            });

            this.graph.launchWebSocket(`ws://${this.url}/attachSession/${this.sessionId}`);
        });
    }

    private downloadResults() {
        this.graph.closeSocket();
        let markedForDeletionExternalGraphs : DialogHandler[]= [];
        this.externalGraphs.forEach((eg) => {
            if (!eg.win.isDestroyed()){
                eg.win.webContents.send("close");
            } else{
                // The window have been destroyed, remove it from external graphs
                markedForDeletionExternalGraphs.push(eg);
            }
        });
        markedForDeletionExternalGraphs.forEach((eg) => {
            this.externalGraphs.splice(this.externalGraphs.indexOf(eg, 0),1);
        });
        this.simulationCompletedHandler();

        let resultPath = Path.normalize(`${this.resultDir}/outputs.csv`);
        let coeConfigPath = Path.normalize(`${this.resultDir}/coe.json`);
        let mmConfigPath = Path.normalize(`${this.resultDir}/mm.json`);
        let logPath = Path.normalize(`${this.resultDir}/log.zip`);

        this.http.get(`http://${this.url}/result/${this.sessionId}/plain`, {responseType: 'text'})
            .subscribe(response => {
                // Write results to disk and save a copy of the multi model and coe configs
                Promise.all([
                    this.fileSystem.writeFile(resultPath, response),
                    this.fileSystem.copyFile(this.config.sourcePath, coeConfigPath),
                    this.fileSystem.copyFile(this.config.multiModel.sourcePath, mmConfigPath)
                ]).then(() => {
                    this.coe.simulationFinished();
                    this.progress = 100;
                    storeResultCrc(resultPath, this.config);
                    this.executePostProcessingScript(resultPath);
                }).catch(error => console.error("Error when writing results: " + error));
            });


        var logStream = fs.createWriteStream(logPath);
        let url = `http://${this.url}/result/${this.sessionId}/zip`;
        var request = http.get(url, (response: http.IncomingMessage) => {
            response.pipe(logStream);
            response.on('end', () => {

                // simulation completed + result
                let destroySessionUrl = `http://${this.url}/destroy/${this.sessionId}`;
                http.get(destroySessionUrl, (response: any) => {
                    let statusCode = response.statusCode;
                    if (statusCode != 200)
                        console.error("Destroy session returned statuscode: " + statusCode)
                });
            });
        });
    }

    private createPanel(title: string, content: HTMLElement): HTMLElement {
        var divPanel = document.createElement("div");
        divPanel.className = "panel panel-default";

        var divTitle = document.createElement("div");
        divTitle.className = "panel-heading";
        divTitle.innerText = title;

        var divBody = document.createElement("div");
        divBody.className = "panel-body";
        divBody.appendChild(content);

        divPanel.appendChild(divTitle);
        divPanel.appendChild(divBody);

        return divPanel;
    }

    private executePostProcessingScript(outputFile: string) {

        let script: string = this.config.postProcessingScript;
        let self = this;

        //default will be '.'
        if (script == null || script.length <= 1)
            return;


        let scriptNormalized = Path.normalize(Path.join(this.config.projectRoot, script));
        var scriptExists = false;
        try {
            fs.accessSync(scriptNormalized, fs.constants.R_OK);
            scriptExists = true;

        } catch (e) {

        }

        if (scriptExists) {
            script = scriptNormalized;
        }

        var spawn = child_process.spawn;

        var child = spawn(script, ["\"" + outputFile + "\"", "" + this.config.endTime], {
            detached: true,
            shell: true,
            cwd: Path.dirname(outputFile)
        });
        child.unref();

        child.stdout.on('data', function (data: any) {
            self.postProcessingOutputReport(false, data + "");
        });

        child.stderr.on('data', function (data: any) {
            console.log('stderr: ' + data);
            self.postProcessingOutputReport(true, data + "");
        });
    }

}
