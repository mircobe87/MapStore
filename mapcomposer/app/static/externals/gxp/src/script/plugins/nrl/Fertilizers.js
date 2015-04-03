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
            typeName: "nrl: district_crop",
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
            typeName: "nrl: province_crop",
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
     /**
      * api: method[addActions]
      */
     addOutput: function(config) {
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
                    ref: 'commodities',
                    height: 160,
                    store: {},
                    columns: {
                    },
                    allowBlank: false,
                    name: 'crop',
                    anchor: '100%',
                    listeners: {
                        scope: this,
                        selectionchange: function(records){
                        }
                    }
                },{ // TIME RANGE  radiogroup ------------------------------
                    fieldLabel: 'Time Range',
                    xtype: 'radiogroup',
                    anchor: '100%',
                    autoHeight: true,
                    ref: 'timerange',
                    title: this.outputTypeText,
                    defaultType: 'radio',
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
                    ref: 'yearSelector'
                },{ // MONTH range selector --------------------------------
                    ref: 'monthRangeSelector',
                    xtype: 'monthyearrangeselector',
                    anchor: '100%',
                    noCrossYear: true
                },{ // YEAR range selector ---------------------------------
                    ref: 'yearRangeSelector',
                    xtype: 'yearrangeselector',
                    anchor: '100%'
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
                        district: 'nrl: district_boundary',
                        province: 'nrl: province_boundary'
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
            ]
        };

        config = Ext.apply(Fertilizers, config || {});
        this.output = gxp.plugins.nrl.Fertilizers.superclass.addOutput.call(this, config);

         return this.output;
     }

 });

Ext.preg(gxp.plugins.nrl.Fertilizers.prototype.ptype, gxp.plugins.nrl.Fertilizers);
