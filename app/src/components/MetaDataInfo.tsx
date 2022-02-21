interface MetaDataProps {
    repoName: string
    branchName: string
}

export default function MetaDataInfo(props: MetaDataProps) {
    return (
        <div>
            <label><strong>Repository:</strong> {props.repoName}</label>
            <br/>
            <label><strong>Branch: </strong>{props.branchName}</label>
        </div>
    )
}