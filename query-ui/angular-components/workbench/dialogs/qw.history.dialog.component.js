import {MnLifeCycleHooksToStream}     from 'mn.core';
import {NgbActiveModal}               from '@ng-bootstrap/ng-bootstrap';
import {Component, ViewEncapsulation} from '@angular/core';
import { CommonModule }               from '@angular/common';
import { QwQueryService }             from "../../../angular-services/qw.query.service.js";
import { QwDialogService }            from '../../../angular-directives/qw.dialog.service.js';

export { QwHistoryDialog };

class QwHistoryDialog extends MnLifeCycleHooksToStream {
  static get annotations() {
    return [
    new Component({
      templateUrl: new URL("./qw.history.dialog.html", import.meta.url).pathname,
      styleUrls: ["../_p/ui/query/angular-directives/qw.directives.css"],
      imports: [ CommonModule ],
      inputs: [],
      encapsulation: ViewEncapsulation.None,
    })
  ]}

  static get parameters() {
    return [
      NgbActiveModal,
      QwDialogService,
      QwQueryService,
      ];
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
    this.scrollHistoryToSelected();
  }

  constructor(activeModal,qwDialogService,qwQueryService) {
    super();

    this.activeModal = activeModal;
    this.qwDialogService = qwDialogService;
    this.qwQueryService = qwQueryService;
    this.selected = [];
    this.selected[qwQueryService.getCurrentIndexNumber()] = true;
    this.historySearchResults = [];
    this.searchInfo = {searchText: "", searchLabel: "search:"};
  }

  select(index,keyEvent) {
    // with no modifiers, create a new selection where they clicked
    //console.log("Got select, event: " + " alt: " + keyEvent.altKey + ", ctrl: " + keyEvent.ctrlKey + ", shift: " + keyEvent.shiftKey);
    if (!keyEvent.shiftKey) {
      for (var i=0; i < this.qwQueryService.getPastQueries().length; i++)
        this.selected[i] = false;
      this.qwQueryService.setCurrentIndex(index);
      this.selected[index] = true;
    }
      // otherwise select the range from the clicked row to the selected row, and make the first one
    // the "current"
    else {
      var alreadySelected = this.selected[index];
      var start = Math.min(index,this.qwQueryService.getCurrentIndexNumber());
      var end = Math.max(index,this.qwQueryService.getCurrentIndexNumber());
      for (var i=start; i <= end; i++)
        this.selected[i] = true;
      // unselect any additional queries
      if (alreadySelected) // if they within the existing the selection, shorten it
        for (var i=end+1; i< this.qwQueryService.getPastQueries().length; i++)
          this.selected[i] = false;
      this.qwQueryService.setCurrentIndex(start);
    }
  }

  pastQueries() {
    return this.qwQueryService.getPastQueries();
  }

  isRowSelected(row) {return(this.selected[row]);}

  isRowMatched(row)  {return(this.historySearchResults.includes(row));}

  showRow(row)       {return(this.historySearchResults.length == 0 || this.isRowMatched(row));}

  del() {
    var origHistoryLen = this.qwQueryService.getPastQueries().length;
    // delete all selected, visible queries
    for (var i= this.qwQueryService.getPastQueries().length - 1; i >= 0; i--)
      if (this.showRow(i) && this.isRowSelected(i))
        this.qwQueryService.clearCurrentQuery(i);
    // forget any previous selection
    for (var i=0; i < origHistoryLen; i++)
      this.selected[i] = false;
    //console.log("after delete, selecting: " + this.qwQueryService.getCurrentIndexNumber());

    if (this.qwQueryService.getCurrentIndexNumber() >= 0)
      this.selected[this.qwQueryService.getCurrentIndexNumber()] = true;

    updateSearchResults();
  }

  // disable delete button if search results don't include any selected query
  disableDel = function() {
    // can always delete if no search text, or no matching queries
    if (this.searchInfo.searchText.length == 0 || this.historySearchResults.length == 0)
      return false;
    // if search text, see if any matching rows are selected
    for (var i= this.qwQueryService.getCurrentIndexNumber(); i < this.qwQueryService.getPastQueries().length - 1; i++)
      if (this.isRowMatched(i) && this.isRowSelected(i))
        return(false);
      // if we are past the selection, no need to check anything else
      else if (!this.isRowSelected(i))
        break;
    // no selected items visible, return true
    return(true);
  }

  delAll(close) {
    var This = this;
    this.qwDialogService
      .showNoticeDialog("Delete All History",
        "Warning, this will delete the entire query history.")
      .then(
        function success() {
          This.selected = []; This.qwQueryService.clearHistory(); close('ok');
        },
        function cancel() {});
  }

  scrollHistoryToSelected() {
    var label = "qw_history_table_"+ this.qwQueryService.getCurrentIndexNumber();
    var elem = document.getElementById(label);
    if (elem)
      elem.scrollIntoView();
    window.scrollTo(0,0);
  }

  updateSearchLabel() {
    if (this.searchInfo.searchText.trim().length == 0)
      this.searchInfo.searchLabel = "search:";
    else
      this.searchInfo.searchLabel = this.historySearchResults.length + " matches";
  }

  updateSearchResults() {
    var history = this.qwQueryService.getPastQueries();
    // reset the history
    var searchText = this.searchInfo.searchText.toLowerCase();
    this.historySearchResults.length = 0;
    if (this.searchInfo.searchText.trim().length > 0)
      for (var i=0; i<history.length; i++) {
        //console.log("  comparing to: " + history[i].query)
        if (history[i].query.toLowerCase().indexOf(searchText) > -1)
          this.historySearchResults.push(i);
      }

    this.updateSearchLabel();

    if (this.historySearchResults.length == 0)
      this.scrollHistoryToSelected();
  }

  // get the next/previous query matching the search results

  selectNextMatch() {
    var curMatch = this.qwQueryService.getCurrentIndexNumber();

    // nothing to do if no search results
    if (this.historySearchResults.length == 0)
      return;

    // need to find the value in the history array larger than the current selection, or wrap around
    for (var i=0; i < this.historySearchResults.length; i++)
      if (this.historySearchResults[i] > curMatch) {
        this.qwQueryService.setCurrentIndex(this.historySearchResults[i]);
        this.scrollHistoryToSelected();
        return;
      }

    // if we get this far, wrap around to the beginning
    this.qwQueryService.setCurrentIndex(this.historySearchResults[0]);
    this.scrollHistoryToSelected();
  }

  selectPrevMatch() {
    var curMatch = this.qwQueryService.getCurrentIndexNumber();

    // nothing to do if no search results
    if (this.historySearchResults.length == 0)
      return;

    // need to find the last value in the history array smaller than the current selection, or wrap around
    for (var i=this.historySearchResults.length-1;i>=0; i--)
      if (this.historySearchResults[i] < curMatch) {
        this.qwQueryService.setCurrentIndex(this.historySearchResults[i]);
        this.scrollHistoryToSelected();
        return;
      }

    // if we get this far, wrap around to the beginning
    this.qwQueryService.setCurrentIndex(this.historySearchResults[this.historySearchResults.length-1]);
    this.scrollHistoryToSelected();
  }


}
