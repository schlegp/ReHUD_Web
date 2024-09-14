import HudElement from "./HudElement";
import {valueIsValidAssertNull} from "../consts";

export default class EngineMap extends HudElement {
    override sharedMemoryKeys: string[] = ['engineMapSetting'];

    protected override render(em: number): string {
        return `EM: ${valueIsValidAssertNull(em) ? em : 5}`;
    }
}