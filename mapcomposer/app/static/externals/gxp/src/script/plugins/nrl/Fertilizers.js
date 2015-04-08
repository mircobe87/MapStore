/**
 *  Copyright (C) 2007 - 2012 GeoSolutions S.A.S.
 *  http://www.geo-solutions.it
 *
 *  GPLv3 + Classpath exception
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
/**
 * @author Mirco Bertelli
 */

/**
 * @requires plugins/Tool.js
 */

/** api: (define)
 *  module = gxp.plugins
 *  class = Fertilizers
 */

/** api: (extends)
 *  plugins/Tool.js
 */
Ext.namespace("gxp.plugins.nrl");

/** api: constructor
 *  .. class:: Fertilizers(config)
 *
 *    Plugin for adding NRL Fertilizers Module to a : class:`gxp.Viewer`.
 */
gxp.plugins.nrl.Fertilizers = Ext.extend(gxp.plugins.Tool, {

    /** api: ptype = gxp_addgroup */
    titleText: 'Fertilizers',
    outputTypeText: 'Output Type',
    ptype: "nrl_fertilizers",
    hilightLayerName: "Fertilizers_Selection_Layer",
    comboConfigs: {
        base: {
            anchor: '100%',
            fieldLabel: 'District',
            predicate: "ILIKE",
            width: 250,
            sortBy: "province",
            ref: 'singleSelector',
            displayField: "name",
            pageSize: 10
            
        },
        district:{
            typeName: "nrl:district_crop",
            queriableAttributes: [
                "district",
                "province"
            ],
            recordModel: [
                {
                    name: "id",
                    mapping: "id"
                },{
                    name: "geometry",
                    mapping: "geometry"
                },{
                    name: "name",
                    mapping: "properties.district"
                },{
                    name: "province",
                    mapping: "properties.province"
                },{
                    name: "properties",
                    mapping: "properties"
                }
            ],
            tpl: "<tpl for=\".\"><div class=\"search-item\"><h3>{name}</span></h3>({province})</div></tpl>"
        },
        province:{
            typeName: "nrl:province_crop",
            recordModel: [
                {
                    name: "id",
                    mapping: "id"
                },{
                    name: "geometry",
                    mapping: "geometry"
                },{
                    name: "name",
                    mapping: "properties.province"
                },{
                    name: "properties",
                    mapping: "properties"
                }
            ],
            sortBy: "province",
            queriableAttributes: [
                "province"
            ],
            displayField: "name",
            tpl: "<tpl for=\".\"><div class=\"search-item\"><h3>{name}</span></h3>(Province)</div></tpl>"
        }
    },
    metadataUrl: "http://84.33.2.24/geoserver/nrl/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=nrl:fertilizers_metadata&outputFormat=json",
    metadataFields: [
        {name: 'nutrient', mapping: 'properties.nutrient'},
        {name: 'oldest_nat_y', mapping: 'properties.oldest_nat_y'},
        {name: 'newest_nat_y', mapping: 'properties.newest_nat_y'},
        {name: 'oldest_prov_y', mapping: 'properties.oldest_prov_y'},
        {name: 'newest_prov_y', mapping: 'properties.newest_prov_y'},
        {name: 'oldest_dist_y', mapping: 'properties.oldest_dist_y'},
        {name: 'newest_dist_y', mapping: 'properties.newest_dist_y'}
    ],
     /**
      * api: method[addActions]
      */
     addOutput: function(config) {
        var loadStoreTrigger = function(){
            var dataStore = this.output.fertilizers.getStore();
            for(var i=0; i<dataStore.data.items.length; i++){
                var dataItem = dataStore.data.items[i].data;
                var fertMetadata = {
                    dataNationalYears: {
                        oldest: undefined,
                        newest: undefined
                    },
                    dataProvincialYears: {
                        oldest: undefined,
                        newest: undefined
                    },
                    dataDistrictYears: {
                        oldest: undefined,
                        newest: undefined
                    }
                };
                var fertLbl;
                for(var prop in dataItem){
                    switch(prop){
                        case 'nutrient': fertLbl = dataItem[prop]; break;
                        case 'oldest_nat_y': fertMetadata.dataNationalYears.oldest = dataItem[prop]; break;
                        case 'newest_nat_y': fertMetadata.dataNationalYears.newest = dataItem[prop]; break;
                        case 'oldest_prov_y': fertMetadata.dataProvincialYears.oldest = dataItem[prop]; break;
                        case 'newest_prov_y': fertMetadata.dataProvincialYears.newest = dataItem[prop]; break;
                        case 'oldest_dist_y': fertMetadata.dataDistrictYears.oldest = dataItem[prop]; break;
                        case 'newest_dist_y': fertMetadata.dataDistrictYears.newest = dataItem[prop]; break;
                    }
                }
                this.output.fertilizers.metadata[fertLbl] = fertMetadata;

            }
        };

        this.comboConfigs.base.url = this.dataUrl;
        var apptarget = this.target;
        var Fertilizers = {
            xtype: 'form',
            title: this.titleText,
            layout: "form",
            minWidth: 180,
            autoScroll: true,
            frame: true,
            items:[
                {   // FERTILIZERS grid ------------------------------------
                    xtype: 'nrl_checkboxcelectiongrid',
                    title: 'Fertilizers',
                    enableHdMenu: false,
                    hideHeaders: true,
                    hidden: false,
                    ref: 'fertilizers',
                    height: 160,
                    store: new Ext.data.JsonStore({
                        fields: this.metadataFields,
                        autoLoad: true,
                        url: this.metadataUrl,
                        root: 'features',
                        idProperty:'nutrient',
                        listeners:{
                            scope:this,
                            load:loadStoreTrigger
                        }
                    }),
                    columns: {
                        id: 'nutrient_lbl',
                        header: 'Fertilizer',
                        dataIndex: 'nutrient'
                    },
                    allowBlank: false,
                    name: 'fertilizers',
                    anchor: '100%',
                    listeners: {
                        scope: this,
                        selectionchange: function(records){
                            if(records.length == 0){
                                // there aren't fertilizers selected.
                                // all time-options should be disabled.
                                this.output.fertilizers.setDisabledTimeOptions(true);
                                // the next selection of a fertilizer, if there aren't
                                // data then an alert will show.
                                this.output.noDataAlertWasShown = false;
                            }else{
                                // in this case, time-options should be initialized
                                // with the shorter year renge for which the data
                                // exist.
                                // time-options must be enabled.
                                this.output.fertilizers.setDisabledTimeOptions(false);

                                // computes min & max year given area-option selected and
                                // fertilizers.
                                var areaOptions = this.output.aoiFieldSet.gran_type.getValue().inputValue;
                                var oldest_year, newest_year;
                                var oldests = [], newests = [];
                                for(var i=0; i<records.length; i++){
                                    var record = records[i].data;

                                    switch(areaOptions){
                                        case 'province': {
                                            oldests.push(record.oldest_prov_y);
                                            newests.push(record.newest_prov_y);
                                        }break;
                                        case 'district': {
                                            oldests.push(record.oldest_dist_y);
                                            newests.push(record.newest_dist_y);
                                        }break;
                                        case 'pakistan': {
                                            oldests.push(record.oldest_nat_y);
                                            newests.push(record.newest_nat_y);
                                        }break;
                                    }
                                }
                                oldest_year = Math.min.apply(null, oldests);
                                newest_year = Math.max.apply(null, newests);

                                if (!oldest_year || !newest_year){
                                    // there aren't data for this criteria
                                    this.output.fertilizers.setDisabledTimeOptions(true);
                                    this.output.showNoDataAlert();
                                }else{
                                    // setup store for year combo
                                    var yearSelector = this.output.yearSelector;
                                    var years = [];
                                    for (var y=oldest_year; y<=newest_year; y++)
                                        years.push([y]);

                                    yearSelector.getStore().removeAll();
                                    yearSelector.getStore().loadData(years, false);
                                    yearSelector.setValue(oldest_year);

                                    // setup max and min for year range selector
                                    var yearRangeSelector = this.output.yearRangeSelector;
                                    yearRangeSelector.setMinValue(oldest_year);
                                    yearRangeSelector.setMaxValue(newest_year);
                                }
                            }
                        }
                    },
                    // it'll contains, for each retilizers, start and end year for
                    // national data, province data and district data.
                    metadata: {},
                    setDisabledTimeOptions: function(boolVal){
                        var timeWidgets = [
                            this.ownerCt.timerange,
                            this.ownerCt.yearRangeSelector,
                            this.ownerCt.yearSelector,
                            this.ownerCt.monthRangeSelector
                        ];
                        for(var i=0; i<timeWidgets.length; i++)
                            if (boolVal)
                                timeWidgets[i].disable();
                            else
                                timeWidgets[i].enable();
                    }
                },{ // TIME RANGE  radiogroup ------------------------------
                    fieldLabel: 'Time Range',
                    xtype: 'radiogroup',
                    anchor: '100%',
                    autoHeight: true,
                    ref: 'timerange',
                    title: this.outputTypeText,
                    defaultType: 'radio',
                    disabled: true,
                    columns: 2,
                    items:[
                        {boxLabel: 'Annual' , name: 'timerange', inputValue: 'annual', checked: true},
                        {boxLabel: 'Monthly' , name: 'timerange', inputValue: 'monthly'}
                    ],
                    listeners: {
                        change: function(c, checked){
                            var checkedVal = checked.inputValue;
                            switch (checkedVal){
                                case ('annual'):{
                                    this.setAnnualMode();
                                }break;
                                case ('monthly'):{
                                    this.setMonthlyMode();
                                }break;
                            }
                        }
                    },
                    // shows controllers for select a years range.
                    setAnnualMode: function(){
                        this.ownerCt.yearRangeSelector.show();
                        this.ownerCt.yearSelector.hide();
                        this.ownerCt.monthRangeSelector.hide();
                    },
                    // shows controller to select a month range
                    // from a selected reference year.
                    setMonthlyMode: function(){
                        this.ownerCt.yearRangeSelector.hide();
                        this.ownerCt.yearSelector.show();
                        this.ownerCt.monthRangeSelector.show();
                    },
                    // sets the initial state for the components
                    // used to select time options.
                    initTimeSelection: function(){
                        this.setAnnualMode();
                    }
                },{ // YEAR compobox ---------------------------------------
                    name: 'year',
                    disabled: false,
                    xtype: 'singleyearcombobox',
                    anchor: '100%',
                    ref: 'yearSelector',
                    disabled: true
                },{ // MONTH range selector --------------------------------
                    ref: 'monthRangeSelector',
                    xtype: 'monthyearrangeselector',
                    anchor: '100%',
                    noCrossYear: true,
                    disabled: true
                },{ // YEAR range selector ---------------------------------
                    ref: 'yearRangeSelector',
                    xtype: 'yearrangeselector',
                    anchor: '100%',
                    disabled: true
                },{ // AOI selector ----------------------------------------
                    xtype: 'nrl_aoifieldset',
                    name: 'region_list',
                    ref: 'aoiFieldSet',
                    layerStyle: this.layerStyle,
                    anchor: '100%',
                    target: this.target,
                    comboConfigs: this.comboConfigs,
                    areaFilter: this.areaFilter, 
                    hilightLayerName: this.hilightLayerName,
                    layers:{
                        district: 'nrl:district_boundary',
                        province: 'nrl:province_boundary'
                    }
                }
            ],
            listeners: {
                // when all the items of form are arranged
                // it sets the inital configurations for all
                afterlayout: function(f){
                    f.timerange.initTimeSelection();
                }
            },
            buttons:[
                {
                    url: this.dataUrl,
                    xtype: 'gxp_nrlCropDataButton',
                    typeName: this.typeNameData,
                    ref: '../submitButton',
                    target: this,
                    form: this,
                    disabled: true
                }
            ],
            noDataAlertWasShown: false,
            showNoDataAlert: function(){
                if (!this.noDataAlertWasShown){
                    Ext.MessageBox.alert('No data available', 'There are not data available for this search criteria.');
                    this.noDataAlertWasShown = true;
                }
            }
        };

        config = Ext.apply(Fertilizers, config || {});
        this.output = gxp.plugins.nrl.Fertilizers.superclass.addOutput.call(this, config);

         return this.output;
     }

 });

Ext.preg(gxp.plugins.nrl.Fertilizers.prototype.ptype, gxp.plugins.nrl.Fertilizers);
