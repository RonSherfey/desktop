import * as React from 'react'
import { IAPIWorkflowJobStep } from '../../lib/api'
import {
  getCheckRunGroupNames,
  getCheckRunsGroupedByActionWorkflowNameAndEvent,
  IRefCheck,
  isFailure,
} from '../../lib/ci-checks/ci-checks'
import { CICheckRunListItem } from './ci-check-run-list-item'
import { FocusContainer } from '../lib/focus-container'

interface ICICheckRunListProps {
  /** List of check runs to display */
  readonly checkRuns: ReadonlyArray<IRefCheck>

  /** Whether loading action logs */
  readonly loadingActionLogs: boolean

  /** Whether loading workflow  */
  readonly loadingActionWorkflows: boolean

  /** Whether check runs can be selected. Default: false */
  readonly selectable?: boolean

  /** Callback to opens check runs target url (maybe GitHub, maybe third party) */
  readonly onViewCheckDetails: (checkRun: IRefCheck) => void

  /** Callback when a check run is clicked */
  readonly onCheckRunClick?: (checkRun: IRefCheck) => void

  /** Callback to open a job steps link on dotcom*/
  readonly onViewJobStep?: (
    checkRun: IRefCheck,
    step: IAPIWorkflowJobStep
  ) => void
}

interface ICICheckRunListState {
  readonly checkRunExpanded: string | null
  readonly hasUserToggledCheckRun: boolean
}

/** The CI Check list. */
export class CICheckRunList extends React.PureComponent<
  ICICheckRunListProps,
  ICICheckRunListState
> {
  public constructor(props: ICICheckRunListProps) {
    super(props)

    this.state = this.setupStateAfterCheckRunPropChange(this.props, null)
  }

  public componentDidUpdate(prevProps: ICICheckRunListProps) {
    this.setState(
      this.setupStateAfterCheckRunPropChange(this.props, this.state)
    )
  }

  private setupStateAfterCheckRunPropChange(
    props: ICICheckRunListProps,
    currentState: ICICheckRunListState | null
  ): ICICheckRunListState {
    let checkRunExpanded = currentState?.checkRunExpanded ?? null

    if (currentState === null || !currentState.hasUserToggledCheckRun) {
      // If there is a failure, we want the first check run with a failure, to
      // be opened so the user doesn't have to click through to find it.
      // Otherwise, just open the first one. (Only actions type can be expanded.)
      const firstFailure = props.checkRuns.find(
        cr => isFailure(cr) && cr.actionJobSteps !== undefined
      )

      const checkRun = firstFailure ?? props.checkRuns[0]
      checkRunExpanded = checkRun.id.toString()
    }

    return {
      checkRunExpanded,
      hasUserToggledCheckRun: currentState?.hasUserToggledCheckRun || false,
    }
  }

  private onCheckRunClick = (checkRun: IRefCheck): void => {
    // If the list is selectable, we don't want to toggle when the selected
    // item is clicked again.
    const checkRunExpanded =
      this.state.checkRunExpanded === checkRun.id.toString() &&
      !this.props.selectable
        ? null
        : checkRun.id.toString()

    this.setState({
      checkRunExpanded,
      hasUserToggledCheckRun: true,
    })

    this.props.onCheckRunClick?.(checkRun)
  }

  private renderListItems = (
    checkRuns: ReadonlyArray<IRefCheck> | undefined
  ) => {
    if (checkRuns === undefined) {
      // This shouldn't happen as the selection is based off the keys of the map
      return null
    }

    const list = [...checkRuns]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c, i) => {
        const checkRunExpanded = this.state.checkRunExpanded === c.id.toString()
        const selectable = this.props.selectable === true

        return (
          <CICheckRunListItem
            checkRun={c}
            key={i}
            loadingActionLogs={this.props.loadingActionLogs}
            loadingActionWorkflows={this.props.loadingActionWorkflows}
            selectable={selectable}
            selected={selectable && checkRunExpanded}
            // Only expand check runs if the list is not selectable
            isCheckRunExpanded={!selectable && checkRunExpanded}
            onCheckRunExpansionToggleClick={this.onCheckRunClick}
            onViewCheckExternally={this.props.onViewCheckDetails}
            onViewJobStep={this.props.onViewJobStep}
          />
        )
      })

    return (
      <FocusContainer className="list-focus-container">{list}</FocusContainer>
    )
  }

  private renderList = (): JSX.Element | null => {
    const checkRunGroups = getCheckRunsGroupedByActionWorkflowNameAndEvent(
      this.props.checkRuns
    )
    const checkRunGroupNames = getCheckRunGroupNames(checkRunGroups)
    if (checkRunGroupNames.length === 1 && checkRunGroupNames[0] === 'Other') {
      return this.renderListItems(this.props.checkRuns)
    }

    const groups = checkRunGroupNames.map((groupName, i) => {
      return (
        <div className="ci-check-run-list-group" key={i}>
          <div className="ci-check-run-list-group-header">{groupName}</div>
          {this.renderListItems(checkRunGroups.get(groupName))}
        </div>
      )
    })

    return <>{groups}</>
  }

  public render() {
    return (
      <div className="ci-check-run-list-container">{this.renderList()}</div>
    )
  }
}
