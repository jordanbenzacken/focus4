import fetch from "isomorphic-fetch";
import {isObject} from "lodash";
import {v4} from "uuid";

import {messageStore} from "../message";

import {ManagedErrorResponse, manageResponseErrors} from "./error-parsing";
import {requestStore} from "./store";

export async function coreFetch<RQ, RS>(method: "GET" | "POST" | "PUT" | "DELETE", url: string, data?: RQ, id?: string): Promise<any> {
    const body = data ? JSON.stringify(data) : undefined;
    const headers = data ? {"Content-Type": isObject(data) ? "application/json" : "text/plain"} : undefined;
    id = id || v4();
    requestStore.updateRequest({id, url, status: "pending"});
    try {
        const response = await fetch(url, {method, body, headers, credentials: "include"});
        if (requestStore.pending.has(id)) {
            if (response.status >= 200 && response.status < 300) {
                requestStore.updateRequest({id, url, status: "success"});
                if (response.headers.get("Content-Type").includes("application/json")) {
                    return await response.json<RS>();
                } else {
                    return await response.text();
                }
            } else {
                requestStore.updateRequest({id, url, status: "error"});
                if (response.headers.get("Content-Type").includes("application/json")) {
                    return Promise.reject<ManagedErrorResponse>(manageResponseErrors(await response.json()));
                } else {
                    const errorMessage = `${response.status} error when calling ${url}`;
                    console.error(errorMessage);
                    messageStore.addErrorMessage(errorMessage);
                    return Promise.reject<string>(await response.text());
                }
            }
        }
    } catch (e) {
        if (requestStore.pending.has(id)) {
            requestStore.updateRequest({id, url, status: "error"});
            const errorMessage = `"${e.message}" error when calling ${url}`;
            console.error(errorMessage);
            messageStore.addErrorMessage(errorMessage);
            return Promise.reject<string>(errorMessage);
        }
    }
}

export async function httpDelete<RS>(url: string): Promise<RS> {
    return coreFetch("DELETE", url);
}

export async function httpGet<RS>(url: string): Promise<RS> {
    return coreFetch("GET", url);
}

export async function httpPost<RQ, RS>(url: string, data: RQ): Promise<RS> {
    return coreFetch("POST", url, data);
}

export async function httpPut<RQ, RS>(url: string, data: RQ): Promise<RS> {
    return coreFetch("PUT", url, data);
}

/**
 * Exécute une requête et renvoie une fonction qui, si appelée avant la réception de la réponse, permettra d'ignorer le résultat de la requête.
 * @param method La méthode de la requête
 * @param url L'url a requêter
 * @param data Les données à envoyer
 * @param success La fonction a exécuter en cas de succès de la requête.
 * @param error La fonction a exécuter en cas d'erreur dans la requête.
 */
export function cancellableFetch<RQ, RS>(method: "GET" | "POST" | "PUT" | "DELETE", url: string, data?: RQ, success?: (data: RS) => void, error?: (e: any) => void) {
    const id = v4();
    coreFetch<RQ, RS>(method, url, data, id).then(success, error);
    return () => {
        if (requestStore.pending.has(id)) {
            requestStore.updateRequest({id, url, status: "ignored"});
        }
    };
}
