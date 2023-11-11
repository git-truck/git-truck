import { useClickedObject } from "~/contexts/ClickedContext";
import { FileHistoryElement } from "./FileHistoryElement";
import { useNavigation } from "@remix-run/react";

// TODO: Replace it with the fully functional commit tab 
export function CommitDetailsCard() {
    const { clickedObject } = useClickedObject()
    const { state } = useNavigation()
    if (!clickedObject) return null

    return (
        <div className="card bg-white/70 text-black">
            <FileHistoryElement state={ state } clickedObject={ clickedObject } />
        </div>
    );
}
