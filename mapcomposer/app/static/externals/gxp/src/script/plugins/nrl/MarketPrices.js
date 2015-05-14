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
 *  class = MarketPrices
 */

/** api: (extends)
 *  plugins/Tool.js
 */
Ext.namespace("gxp.plugins.nrl");

/** api: constructor
 *  .. class:: MarketPrices(config)
 *
 *    Plugin for adding NRL MarketPrices Module to a : class:`gxp.Viewer`.
 */
gxp.plugins.nrl.MarketPrices = Ext.extend(gxp.plugins.Tool, {

    /** api: ptype = nrl_market_prices */
    titleText: 'MarketPrices',
    outputTypeText: 'Output Type',
    ptype: "nrl_market_prices",
    hilightLayerName: "MarketPrices_Selection_Layer",
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
        district: {
            typeName: "nrl:district_select",
            queriableAttributes: [
                "district",
                "province"
            ],
            recordModel: [{
                name: "id",
                mapping: "id"
            }, {
                name: "geometry",
                mapping: "geometry"
            }, {
                name: "name",
                mapping: "properties.district"
            }, {
                name: "province",
                mapping: "properties.province"
            }, {
                name: "properties",
                mapping: "properties"
            }],
            tpl: "<tpl for=\".\"><div class=\"search-item\"><h3>{name}</span></h3>({province})</div></tpl>"
        },
        province: {
            typeName: "nrl:province_select",
            recordModel: [{
                name: "id",
                mapping: "id"
            }, {
                name: "geometry",
                mapping: "geometry"
            }, {
                name: "name",
                mapping: "properties.province"
            }, {
                name: "properties",
                mapping: "properties"
            }],
            sortBy: "province",
            queriableAttributes: [
                "province"
            ],
            displayField: "name",
            tpl: "<tpl for=\".\"><div class=\"search-item\"><h3>{name}</span></h3>(Province)</div></tpl>"
        }
    },
    metadataUrl: "http://84.33.2.24/geoserver/nrl/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=nrl:crops_metadata&outputFormat=json",
    metadataFields: [{
        name: 'crop',
        mapping: 'properties.crop'
    }, {
        name: 'label',
        mapping: 'properties.crop',
        convert: function(v, rec){
            return nrl.chartbuilder.util.toTitleCase(v);
        }
    }, {
        name: 'max_dec_abs',
        mapping: 'properties.max_dec_abs'
    }, {
        name: 'min_dec_abs',
        mapping: 'properties.min_dec_abs'
    }],
    radioQtipTooltip: "You have to be logged in to use this method",
    /**
     * api: method[addActions]
     */
    addOutput: function(config) {
        var loadStoreTrigger = function() {
            var dataStore = this.output.crops.getStore();
            // keep in mind: there is only one record for each crop
            for (var i = 0; i < dataStore.data.items.length; i++) {
                var dataItem = dataStore.data.items[i].data;

                var cropMetadata = {};
                for (var prop in dataItem)
                    if (prop != 'crop')
                        cropMetadata[prop] = dataItem[prop];

                this.output.crops.metadata[dataItem.crop] = cropMetadata;
            }
        };

        this.comboConfigs.base.url = this.dataUrl;
        var apptarget = this.target;

        var MarketPrices = {
            isRendered: false,
            xtype: 'form',
            title: this.titleText,
            layout: "form",
            minWidth: 180,
            autoScroll: true,
            frame: true,
            items: [{ // OUTPUT TYPE radiogroup ------------------------------
                fieldLabel: this.outputTypeText,
                xtype: 'radiogroup',
                anchor: '100%',
                autoHeight: true,
                name: 'outputType',
                ref: 'outputType',
                checkboxToggle: true,
                title: this.outputTypeText,
                autoHeight: true,
                defaultType: 'radio', // each item will be a radio button
                items: [{
                    boxLabel: 'Data',
                    name: 'outputtype',
                    listeners: this.setRadioQtip(this.radioQtipTooltip),
                    inputValue: 'data',
                    disabled: true
                }, {
                    boxLabel: 'Chart',
                    name: 'outputtype',
                    inputValue: 'chart',
                    checked: true
                }],
                listeners: {
                    change: function(c, checked) {
                        var outputValue = c.getValue().inputValue;
                        var submitButton = this.output.submitButton;
                        var aoiFieldSet = this.output.aoiFieldSet;
                        var areaSelector = aoiFieldSet.AreaSelector;
                        var gran_type = aoiFieldSet.gran_type.getValue().inputValue;
                        var submitButtonState = submitButton.disabled;
                        var xType = 'gxp_nrlMarketPrices' + (outputValue == 'data' ? 'Tab' : 'Chart') + 'Button';

                        this.output.outputMode = outputValue;
                        submitButton.destroy();
                        delete submitButton;

                        this.output.addButton({
                            url: this.dataUrl,
                            typeName: this.typeNameData,
                            xtype: xType,
                            ref: '../submitButton',
                            highChartExportUrl: this.highChartExportUrl,
                            target: this.target,
                            form: this,
                        });

                        var store = areaSelector.store;
                        this.output.fireEvent('update', store);
                        this.output.fireEvent('show');

                        
                        this.output.comparisonby.setDisabled(outputValue == 'data');
                        if (outputValue == 'data'){
                            this.output.comparisonby.oldValue = this.output.comparisonby.getValue().inputValue;
                            this.output.comparisonby.setValue('commodity');
                        }else{
                            this.output.comparisonby.setValue(this.output.comparisonby.oldValue);
                        }
                        this.output.doLayout();
                        this.output.syncSize();

                        this.output.submitButton.setDisabled(submitButtonState);

                        if (outputValue != 'data')
                            this.output.submitButton.initChartOpt(this.output);
                    },
                    scope: this
                }
            }, { // TIME RANGE  radiogroup ------------------------------
                style: {
                    marginTop: '6px'
                },
                fieldLabel: 'Time Range',
                xtype: 'radiogroup',
                anchor: '100%',
                autoHeight: true,
                ref: 'timerange',
                title: this.outputTypeText,
                defaultType: 'radio',
                disabled: false,
                columns: 2,
                items: [{
                    boxLabel: 'Annual',
                    name: 'timerange',
                    inputValue: 'annual',
                    checked: true
                }, {
                    boxLabel: 'Monthly',
                    name: 'timerange',
                    inputValue: 'monthly'
                }],
                listeners: {
                    change: function(c, checked) {
                        var checkedVal = checked.inputValue;
                        switch (checkedVal) {
                            case ('annual'):
                                {
                                    this.setAnnualMode();
                                }
                                break;
                            case ('monthly'):
                                {
                                    this.setMonthlyMode();
                                }
                                break;
                        }
                        var selectedCrops = this.ownerCt.crops.getSelections();
                        if (selectedCrops.length != 0)
                            this.ownerCt.setUpMaxAndMin(selectedCrops);
                    }
                },
                // shows controllers for select a years range.
                setAnnualMode: function() {
                    this.ownerCt.yearRangeSelector.show();
                    this.ownerCt.yearSelector.hide();
                    this.ownerCt.monthRangeSelector.hide();
                },
                // shows controller to select a month range
                // from a selected reference year.
                setMonthlyMode: function() {
                    this.ownerCt.yearRangeSelector.hide();
                    this.ownerCt.yearSelector.show();
                    this.ownerCt.monthRangeSelector.show();
                },
                // sets the initial state for the components
                // used to select time options.
                initTimeSelection: function() {
                    this.setAnnualMode();
                }
            }, { // YEAR compobox ---------------------------------------
                name: 'year',
                disabled: false,
                xtype: 'singleyearcombobox',
                anchor: '100%',
                ref: 'yearSelector',
                disabled: false
            }, { // MONTH range selector --------------------------------
                ref: 'monthRangeSelector',
                xtype: 'monthyearrangeselector',
                anchor: '100%',
                noCrossYear: false,
                disabled: false
            }, { // YEAR range selector ---------------------------------
                ref: 'yearRangeSelector',
                xtype: 'yearrangeselector',
                anchor: '100%',
                disabled: false
            }, { // AOI selector ----------------------------------------
                style: {
                    marginTop: '6px'
                },
                xtype: 'nrl_aoifieldset',
                name: 'region_list',
                ref: 'aoiFieldSet',
                layerStyle: this.layerStyle,
                anchor: '100%',
                target: this.target,
                comboConfigs: this.comboConfigs,
                areaFilter: this.areaFilter,
                hilightLayerName: this.hilightLayerName,
                layers: this.layers,
                selectableLayer: this.layers.province,
                listeners: {
                    grantypeChange: function(itemSelected) {
                        var granType = itemSelected.inputValue;
                        var records = this.ownerCt.crops.getSelections();
                        var outputtype = this.ownerCt.outputType.getValue().inputValue;
                        
                        this.refOwner.updateSubmitBtnState();
                        if (outputtype != 'data')
                            this.ownerCt.submitButton.initChartOpt(this.ownerCt);
                    },
                    regionsChange: function(s) {
                        var granType = this.gran_type.getValue().inputValue;
                        var records = this.ownerCt.crops.getSelections();
                        var outputtype = this.ownerCt.outputType.getValue().inputValue;

                        this.refOwner.updateSubmitBtnState();
                        if (outputtype != 'data')
                            this.ownerCt.submitButton.initChartOpt(this.ownerCt);
                    }
                }
            }, { // COMPARISON radio ------------------------------------
                style: {
                    marginTop: '6px'
                },
                fieldLabel: 'Comparision by',
                xtype: 'radiogroup',
                anchor: '100%',
                autoHeight: true,
                ref: 'comparisonby',
                title: this.outputTypeText,
                defaultType: 'radio',
                disabled: false,
                columns: 2,
                items: [{
                    boxLabel: 'Commodity',
                    name: 'comparisonby',
                    inputValue: 'commodity',
                    checked: true
                }, {
                    boxLabel: 'Region',
                    name: 'comparisonby',
                    inputValue: 'region'
                }],
                listeners: {
                    change: function(b){
                        var outputtype = this.ownerCt.outputType.getValue().inputValue;
                        if (outputtype != 'data')
                            this.ownerCt.submitButton.initChartOpt(this.ownerCt);
                    }
                }
            }, { // CROPS grid ------------------------------------------
                xtype: 'nrl_checkboxcelectiongrid',
                title: 'Crops',
                enableHdMenu: false,
                hideHeaders: false,
                hidden: false,
                ref: 'crops',
                height: 160,
                store: new Ext.data.JsonStore({
                    fields: this.metadataFields,
                    autoLoad: true,
                    url: this.metadataUrl,
                    root: 'features',
                    idProperty: 'crop',
                    listeners: {
                        scope: this,
                        load: loadStoreTrigger
                    }
                }),
                columns: {
                    id: 'crop_lbl',
                    header: '',
                    dataIndex: 'label'
                },
                allowBlank: false,
                name: 'crops',
                anchor: '100%',
                listeners: {
                    scope: this,
                    selectionchange: function(records) {
                        if (records.length != 0)
                            this.output.setUpMaxAndMin(records);
                        this.output.updateSubmitBtnState();

                        var outputtype = this.output.outputType.getValue().inputValue;
                        if (outputtype != 'data')
                            this.output.submitButton.initChartOpt(this.output);
                    }
                },
                // it'll contain, for each fertilizers, start and end year for
                // national data, province data and district data.
                metadata: {},
                setDisabledTimeOptions: function(boolVal) {
                    var timeWidgets = [
                        this.ownerCt.timerange,
                        this.ownerCt.yearRangeSelector,
                        this.ownerCt.yearSelector,
                        this.ownerCt.monthRangeSelector
                    ];
                    for (var i = 0; i < timeWidgets.length; i++)
                        if (boolVal)
                            timeWidgets[i].disable();
                        else
                            timeWidgets[i].enable();
                }
            }, { // PRICE OPTIONS fieldset ------------------------------
                style: {
                    marginTop: '12px',
                },
                xtype: 'fieldset',
                title: 'Price Options',
                items: [{
                    xtype: 'combo',
                    fieldLabel: 'Currency',
                    editable: false,
                    ref: '../currency',
                    anchor: '100%',
                    store: this.currencies,
                    triggerAction: 'all',
                    autoLoad: true,
                    allowBlank: false,
                    value: this.defaultCurrency,
                    listeners: {
                        'select': function() {
                            this.ownerCt.fireEvent('afterlayout', this.ownerCt);
                            
                            var outputtype = this.ownerCt.ownerCt.outputType.getValue().inputValue;
                            if (outputtype != 'data')
                                this.ownerCt.ownerCt.submitButton.initChartOpt(this.ownerCt.ownerCt);
                        }
                    }
                }, {
                    xtype: 'combo',
                    fieldLabel: 'Denominator',
                    editable: false,
                    ref: '../denominator',
                    anchor: '100%',
                    triggerAction: 'all',
                    mode: 'local',
                    typeAhead: true,
                    lazyRender: false,
                    hiddenName: 'production_unit',
                    forceSelected: true,
                    allowBlank: false,
                    displayField: 'name',
                    valueField: 'coefficient',
                    value: this.defaultDenominator,
                    store: new Ext.data.JsonStore({
                        baseParams: {
                            viewParams: 'class:denominator'
                        },
                        fields: [{
                            name: 'id',
                            mapping: 'properties.uid'
                        }, {
                            name: 'label',
                            mapping: 'properties.label'
                        }, {
                            name: 'cid',
                            mapping: 'properties.cid'
                        }, {
                            name: 'cls',
                            mapping: 'properties.cls'
                        }, {
                            name: 'coefficient',
                            mapping: 'properties.coefficient'
                        }, {
                            name: 'description',
                            mapping: 'properties.description'
                        }, {
                            name: 'filter',
                            mapping: 'properties.filter'
                        }, {
                            name: 'name',
                            mapping: 'properties.name'
                        }, {
                            name: 'shortname',
                            mapping: 'properties.shortname'
                        }],
                        autoLoad: true,
                        url: this.factorsurl,
                        root: 'features',
                        idProperty: 'uid'
                    }),
                    listeners: {
                        'select': function() {
                            this.ownerCt.fireEvent('afterlayout', this.ownerCt);

                            var outputtype = this.ownerCt.ownerCt.outputType.getValue().inputValue;
                            if (outputtype != 'data')
                                this.ownerCt.ownerCt.submitButton.initChartOpt(this.ownerCt.ownerCt);
                        }
                    }
                }, {
                    xtype: 'label',
                    anchor: '100%',
                    fieldLabel: 'Output',
                    ref: '../lblOutput',
                    text: ''
                }],
                listeners: {
                    'afterlayout': function(fieldset) {
                        var currCombo = fieldset.getComponent(0);
                        var denoCombo = fieldset.getComponent(1);
                        var lbl = fieldset.getComponent(2);
                        lbl.setText(currCombo.getRawValue() + '/' + denoCombo.getRawValue())
                    }
                }
            }],
            listeners: {
                                                    ////////
                afterlayout: function(f) {                // this couple of handler is used with the
                    if (f.isRendered) {                   // varible 'isRendered' to execute 'initTimeSelection()'
                        f.isRendered = false;             // only once at the beginning, when the form is show
                        f.timerange.initTimeSelection();  // for the first time.
                    }                                     //
                },                                        //
                afterRender: function(f) {                //
                        f.isRendered = true;              //
                    }                                     //
                                                    ////////
            },
            buttons: [{
                url: this.dataUrl,
                xtype: 'gxp_nrlMarketPricesChartButton',
                typeName: this.typeNameData,
                ref: '../submitButton',
                target: this,
                form: this,
                disabled: true
            }],
            // set the max and min values for
            //  - yearRangeSelector
            //  - monthRangeSelector
            //  - yearSelector
            setUpMaxAndMin: function(records) {

                var startRange = Number.MAX_SAFE_INTEGER;
                var endRange = Number.MIN_SAFE_INTEGER;
                for (var rIndex = 0; rIndex < records.length; rIndex++) {
                    var recData = records[rIndex].data;
                    startRange = recData.min_dec_abs < startRange ? recData.min_dec_abs : startRange;
                    endRange = recData.max_dec_abs > endRange ? recData.max_dec_abs : endRange;
                }

                // gets min and max year from absolute decade
                var minYear = nrl.chartbuilder.util.getDekDate(startRange).year;
                var maxYear = nrl.chartbuilder.util.getDekDate(endRange).year;

                // sets up yearRangeSelector max & min values
                this.yearRangeSelector.setMaxValue(maxYear);
                this.yearRangeSelector.setMinValue(minYear);

                // sets year values for yearSelector combobox
                // if it's possible it keeps the previous selected year
                var refYear = this.yearSelector.getValue();
                this.yearSelector.setRange(minYear, maxYear);
                if (refYear == '' || parseInt(refYear) > maxYear || parseInt(refYear) < minYear)
                    this.yearSelector.setValue(maxYear);
                else
                    this.yearSelector.setValue(refYear);

                // sets the range for monthRangeSelector
                var currentRefYear = parseInt(this.yearSelector.getValue());
                // the max and min absolute decades that can be selected by monthRangeSelector
                // for the reference year choosen
                var minDesiredAbsDec = (currentRefYear-1) * 36 +  1; // jan-dek1 of the previous year
                var maxDesiredAbsDec =  currentRefYear    * 36 + 36; // dec-dek3 of the current  year

                // sets the largest month range which contains data for the crops selected.
                var minToSet, maxToSet;
                if (startRange > minDesiredAbsDec)
                    minToSet = nrl.chartbuilder.util.getDekDate(startRange);
                else
                    minToSet = nrl.chartbuilder.util.getDekDate(minDesiredAbsDec);

                if (endRange < maxDesiredAbsDec)
                    maxToSet = nrl.chartbuilder.util.getDekDate(endRange);
                else
                    maxToSet = nrl.chartbuilder.util.getDekDate(maxDesiredAbsDec);

                var minMonth, maxMonth;
                if (minToSet.year < currentRefYear)
                    minMonth = minToSet.month-1;
                else
                    minMonth = minToSet.month-1 + 12;

                if (maxToSet.year < currentRefYear)
                    maxMonth = maxToSet.month-1;
                else
                    maxMonth = maxToSet.month-1 + 12;
                
                this.monthRangeSelector.setValue(0, minMonth);
                this.monthRangeSelector.setValue(1, maxMonth);
            },
            updateSubmitBtnState: function(){
                var gran_type = this.aoiFieldSet.gran_type.getValue().inputValue;
                var selectedCrops = this.crops.getSelections();
                var regionList = this.aoiFieldSet.selectedRegions.getValue();

                var disableBtn = (selectedCrops.length == 0 || gran_type != 'pakistan' && regionList.length == 0);
                this.submitButton.setDisabled(disableBtn);
            },
            outputMode: 'chart'
        };

        config = Ext.apply(MarketPrices, config || {});
        this.output = gxp.plugins.nrl.MarketPrices.superclass.addOutput.call(this, config);

        //hide selection layer on tab change
        this.output.on('beforehide', function() {
            var button = this.output.aoiFieldSet.AreaSelector.selectButton;
            button.toggle(false);
            var lyr = button.hilightLayer;
            if (!lyr) {
                return;
            }
            lyr.setVisibility(false);

        }, this);
        this.output.on('show', function() {
            var button = this.output.aoiFieldSet.AreaSelector.selectButton;

            var lyr = button.hilightLayer;
            if (!lyr) {
                return;
            }
            lyr.setVisibility(true);

        }, this);

        return this.output;
    },
    setRadioQtip: function(t) {
        var o = {
            afterrender: function() {
                //Ext.QuickTips.init();
                var id = Ext.get(Ext.DomQuery.select('#x-form-el-' + this.id + ' div'));
                Ext.QuickTips.register({
                    target: id.elements[id.elements.length - 1].id,
                    text: t
                });
            },
            destroy: function() {
                var id = Ext.get(Ext.DomQuery.select('#x-form-el-' + this.id + ' div'));
                Ext.QuickTips.unregister(id.elements[id.elements.length - 1].id);
            },
            enable: function() {
                var id = Ext.get(Ext.DomQuery.select('#x-form-el-' + this.id + ' div'));
                Ext.QuickTips.unregister(id.elements[id.elements.length - 1].id);
            },
            disable: function() {
                //Ext.QuickTips.init();
                var id = Ext.get(Ext.DomQuery.select('#x-form-el-' + this.id + ' div'));
                Ext.QuickTips.register({
                    target: id.elements[id.elements.length - 1].id,
                    text: t
                });
            }
        }
        return o;
    }
});

Ext.preg(gxp.plugins.nrl.MarketPrices.prototype.ptype, gxp.plugins.nrl.MarketPrices);