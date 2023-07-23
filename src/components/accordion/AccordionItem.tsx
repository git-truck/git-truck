import type { AccordionData } from "./Accordion"
import clsx from "clsx"

function AccordionItem({
    data,
    isOpen,
    btnOnClick,
    titleLabels
}: {
    data: AccordionData
    isOpen: boolean
    btnOnClick: () => void
    titleLabels?: boolean
}) {
    const afterStyle = "after:content-[''] after:shrink-0 after:w-[14px] after:h-[14px] after:ml-auto after:transition-[transform] after:duration-[200ms] after:ease-out after:bg-[length:14px_14px] after:bg-no-repeat after:bg-arrow";
    return (
        <li className="border-0 ">
            <h2 className="w-full m-0">
                <div className={ clsx("flex items-center b-0 w-full cursor-pointer " + afterStyle, {
                    "text-[16px] font-semibold": titleLabels,
                    "text-[14px] font-normal": !titleLabels,
                    "after:-rotate-180": isOpen,
                    "after:rotate-0": !isOpen
                })} onClick={ btnOnClick } title={data.title}>
                    { data.title }
                </div>
            </h2>
            <ul className="block m-0 p-0 text-sm transition-[height] duration-[200ms] ease-out" style={ { height: isOpen ? "auto" : "0" } }>
                { isOpen && <div>{ data.content }</div> }
            </ul>
        </li>
    )
}

export default AccordionItem
