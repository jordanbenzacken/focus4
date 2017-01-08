import {autobind} from "core-decorators";
import {action, computed, map, ObservableMap} from "mobx";
import {v4} from "uuid";

export {ObservableMap};

export interface Request {
    id?: string;
    status: "error" | "ignored" | "pending" | "success";
    url: string;
}

@autobind
export class RequestStore {
    readonly error = map<Request>({});
    readonly ignored = map<Request>({});
    readonly pending = map<Request>({});
    readonly success = map<Request>({});

    @computed.struct
    get count() {
        return {
            error: this.error.size,
            ignored: this.ignored.size,
            pending: this.pending.size,
            success: this.success.size,
            total: this.pending.size + this.success.size + this.error.size
        };
    }

    @action
    clearRequests() {
        this.error.clear();
        this.ignored.clear();
        this.pending.clear();
        this.success.clear();
    }

    @action
    updateRequest(request: Request) {
        request.id = request.id || v4();
        switch (request.status) {
            case "error": this.error.set(request.id, request); break;
            case "ignored": this.ignored.set(request.id, request); break;
            case "pending": this.pending.set(request.id, request); break;
            case "success": this.success.set(request.id, request); break;
        }

        if (request.status !== "pending" && this.pending.has(request.id)) {
            this.pending.delete(request.id);
        }
    }
}

/** Instance principale du RequestStore. */
export const requestStore = new RequestStore();
