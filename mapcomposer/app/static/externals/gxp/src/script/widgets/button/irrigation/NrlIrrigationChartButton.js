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

Ext.namespace('gxp.widgets.button');

/** api: constructor
 *  .. class:: NrlFertilizerButton(config)
 *
 *    Base class to create chart
 *
 */
gxp.widgets.button.NrlIrrigationChartButton = Ext.extend(Ext.SplitButton, {

    /** api: xtype = gxp_nrlchart */
    xtype: 'gxp_nrlIrrigationChartButton',
    iconCls: "gxp-icon-nrl-chart",
    text: 'Generate Chart',
    optionsTitle: "Chart Options",
    tabPanel: 'id_mapTab',
    targetTab: 'irrigation_tab',
    form: null,
    url: null,
    typeName: "nrl:irrigation_data",
    stackedCharts: {
        series: {
            stacking: null
        }
    },
    /**
     * config [windowManagerOptions]
     * Options for the window manager
     */
    windowManagerOptions: {
        title: "Irrigation"
    },
    /**
     * private method[createOptionsFildset]
     * ``String`` title the title of the fieldset
     * ``Object`` opts the chartopts object to manage
     * ``String`` prefix the prefix to use in radio names
     */
    createOptionsFildset: function(title, opts, prefix) {
        var fieldSet = {
            xtype: 'fieldset',
            title: title,
            items: [{ //type
                fieldLabel: "Type",
                xtype: "radiogroup",
                columns: 2,
                items: [{
                    boxLabel: '<span class="icon_span ic_chart-line">Line</span>',
                    name: prefix + "_chart_type",
                    inputValue: "line",
                    checked: opts.type == "line"
                }, {
                    boxLabel: '<span class="icon_span ic_chart-spline">Curve</span>',
                    name: prefix + "_chart_type",
                    inputValue: "spline",
                    checked: opts.type == "spline"
                }, {
                    boxLabel: '<span class="icon_span ic_chart-bar">Bar</span>',
                    name: prefix + "_chart_type",
                    inputValue: "column",
                    checked: opts.type == "column"
                }, {
                    boxLabel: '<span class="icon_span ic_chart-area">Area</span>',
                    name: prefix + "_chart_type",
                    inputValue: "area",
                    checked: opts.type == "area"
                }],
                listeners: {
                    change: function(group, checked) {
                        if (checked) {
                            opts.type = checked.inputValue;
                        }
                    }
                }
            }, { //color
                fieldLabel: 'Color',
                xtype: 'colorpickerfield',
                anchor: '100%',
                value: opts.color.slice(1),
                listeners: {
                    select: function(comp, hex, a, b, c, d, e) {
                        if (hex) {
                            opts.color = '#' + hex;
                            var rgb = comp.menu.picker.hexToRgb(hex);
                            opts.lcolor = "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
                        }
                    }
                }
            }]
        }
        return fieldSet;
    },
    createStackChartsOptions: function(stackedCharts) {
        var fieldSet = {
            xtype: 'fieldset',
            title: 'Stack charts of the same type',
            items: [{
                xtype: 'radiogroup',
                columns: 1,
                fieldLabel: "Stack charts",
                hideLabel: true,
                items: [{
                    checked: stackedCharts.series.stacking == null,
                    boxLabel: 'Do not stack',
                    name: 'stackcharts',
                    inputValue: null
                }, {
                    checked: stackedCharts.series.stacking == "normal",
                    boxLabel: 'Stack',
                    name: 'stackcharts',
                    inputValue: 'normal'
                }, {
                    checked: stackedCharts.series.stacking == "percent",
                    boxLabel: 'Stack as percent of the total',
                    labelSeparator: '',
                    name: 'stackcharts',
                    inputValue: 'percent'
                }],
                listeners: {
                    change: function(c, checked) {
                        stackedCharts.series.stacking = checked.inputValue;
                    }
                }
            }]
        };
        return fieldSet;
    },
    queryOptions: {},
    chartOpt: {},
    menu: {
        items: [{
            ref: '../chartoptions',
            iconCls: 'ic_wrench',
            text: 'Options',
            handler: function(option) {
                //get mode
                var mainButton = this.refOwner;

                var stackedCharts = mainButton.stackedCharts;
                var fieldSetList = [];

                for (var item in this.refOwner.chartOpt.series) {
                    var itemOpts = this.refOwner.chartOpt.series[item];
                    var itemName = itemOpts.name;
                    fieldSetList.push(mainButton.createOptionsFildset(itemName, itemOpts, itemName));
                }
                //fieldSetList.push(mainButton.createStackChartsOptions(stackedCharts));

                var win = new Ext.Window({
                    iconCls: 'ic_wrench',
                    title: mainButton.optionsTitle,
                    height: 400,
                    width: 350,
                    minWidth: 250,
                    minHeight: 200,
                    layout: 'fit',
                    autoScroll: true,
                    maximizable: true,
                    modal: true,
                    resizable: true,
                    draggable: true,
                    layout: 'fit',
                    items: {
                        ref: 'form',
                        xtype: 'form',
                        autoScroll: true,
                        frame: 'true',
                        layout: 'form',
                        items: fieldSetList
                    }
                });
                win.show();
            }
        }]
    },
    /**
     * api method[handler]
     * generate the chart
     */
    handler: function() {
        var getViewParams = {
            getTimeOptions: function(form){
                // gets the options used in the query for grouping data
                var time_opt = (form.timerange.getValue().inputValue == 'monthly' ? 'decade_year' : 'month');

                var from_abs_dec, to_abs_dec, group_opt;
                switch (time_opt) {
                    case 'decade_year':
                        {
                            var refYear = parseInt(form.yearSelector.getValue());
                            from_abs_dec = (refYear - 1) * 36 + 3 * form.monthRangeSelector.slider.getValues()[0] + 1; // 1st dek of the selected month
                            to_abs_dec = (refYear - 1) * 36 + 3 * form.monthRangeSelector.slider.getValues()[1] + 3; // 3rd dek of the selected month
                            group_opt = '"decade_absolute"';
                        }
                        break;
                    case 'month':
                        {
                            from_abs_dec = form.yearRangeSelector.slider.getValues()[0] * 36 + 1; // jan_dek-1
                            to_abs_dec = form.yearRangeSelector.slider.getValues()[1] * 36 + 36; // dec_dek-3
                            group_opt = '"month"';
                        }
                }

                return {
                    time_opt: time_opt,
                    group_opt: group_opt,
                    to_abs_dec: to_abs_dec,
                    from_abs_dec: from_abs_dec
                }
            },

            flow: function(form){
                var selectedRivers = form.riversGrid.getSelections();
                var riverList = [];
                for (var i = 0; i < selectedRivers.length; i++){
                    riverList.push('\'' + selectedRivers[i].data.river + '\'');
                }
                var river_list = riverList.join('\\,');
                form.submitButton.queryOptions.river_list = riverList;
                
                var tOpts = this.getTimeOptions(form);
                form.submitButton.queryOptions.time_opt = tOpts.time_opt;
                form.submitButton.queryOptions.from_abs_dec = tOpts.from_abs_dec;
                form.submitButton.queryOptions.to_abs_dec = tOpts.to_abs_dec;
                form.submitButton.queryOptions.group_opt = tOpts.group_opt;

                return 'group_opt:' + tOpts.group_opt + ';' +
                       'river_list:' + river_list + ';' +
                       'to_abs_dec:' + tOpts.to_abs_dec + ';' +
                       'from_abs_dec:' + tOpts.from_abs_dec + ';'
            },
            supply: function(form){
                // gets the gran type parameter
                var gran_type = form.aoiFieldSet.gran_type.getValue().inputValue;
                form.submitButton.queryOptions.gran_type = gran_type;

                var gran_type_str = '\'' + gran_type + '\'';
                form.submitButton.queryOptions.gran_type_str = gran_type_str;

                var region_list = form.aoiFieldSet.selectedRegions.getValue();
                form.submitButton.queryOptions.region_list = region_list;

                var tOpts = this.getTimeOptions(form);
                form.submitButton.queryOptions.time_opt = tOpts.time_opt;
                form.submitButton.queryOptions.from_abs_dec = tOpts.from_abs_dec;
                form.submitButton.queryOptions.to_abs_dec = tOpts.to_abs_dec;
                form.submitButton.queryOptions.group_opt = tOpts.group_opt;

                return 'group_opt:' + tOpts.group_opt + ';' +
                       'to_abs_dec:' + tOpts.to_abs_dec + ';' +
                       'from_abs_dec:' + tOpts.from_abs_dec + ';' +
                       'region_list:' + region_list + ';' +
                       'gran_type:' + gran_type + ';' +
                       'gran_type_str:' + gran_type_str + ';'
            }
        };

        var getTypeName = function(sourceType) {
            if (sourceType == 'flow')
                return 'nrl:irrigation_data_flow';
            else
                return 'nrl:irrigation_data_supply';
        };

        var getPropertyName = function(sourceType) {
            if (sourceType == 'flow') {
                return 'river,abs_dec,waterflow';
            } else {
                return 'province,district,abs_dec,withdrawal';
            }
        }

        var sourceType = this.refOwner.source.getValue().inputValue;

        var viewparams = getViewParams[sourceType](this.refOwner);
        var typeName = getTypeName(sourceType);
        var propertyName = getPropertyName(sourceType);

        Ext.Ajax.request({
            scope: this,
            url: this.url,
            method: 'POST',
            params: {
                service: "WFS",
                version: "1.0.0",
                request: "GetFeature",
                typeName: typeName,
                outputFormat: "json",
                propertyName: propertyName,
                viewparams: viewparams
            },
            success: function(result, request) {
                debugger;
                try {
                    var jsonData = Ext.util.JSON.decode(result.responseText);
                } catch (e) {
                    Ext.Msg.alert("Error", "Error parsing data from the server");
                    return;
                }
                if (jsonData.features.length <= 0) {
                    Ext.Msg.alert("No data", "Data not available for these search criteria");
                    return;
                }

                var customOpt = {
                    stackedCharts: this.stackedCharts,
                    highChartExportUrl: this.target.highChartExportUrl,
                    uomLabel: this.refOwner.lblOutput.text
                };

                var gran_type = this.refOwner.aoiFieldSet.gran_type.getValue().inputValue;
                var comparisonby = this.refOwner.comparisonby.getValue().inputValue;

                var data = nrl.chartbuilder.irrigation[comparisonby].getData(jsonData, gran_type);
                var charts = nrl.chartbuilder.irrigation[comparisonby].makeChart(data, this.chartOpt, customOpt, this.queryOptions);

                var wins = gxp.WindowManagerPanel.Util.createChartWindows(charts, undefined);
                gxp.WindowManagerPanel.Util.showInWindowManager(wins, this.tabPanel, this.targetTab, this.windowManagerOptions);
            },
            failure: function(result, request) {
                console.log('FAIL!');
                console.log(result);
                console.log(request);
            }
        });
    },
    initChartOpt: function(form) {

        var source = form.source.getValue().inputValue;

        var ret = {
            height: 500,
            series: {}
        };

        var options = form.submitButton.chartOpt;
        var uomLabel = "UNIT"; //form.lblOutput.text;

        if (source == 'flow') {
            // one serie for each selected river
            var selectedRivers = form.riversGrid.getSelections();
            var colorRGB = nrl.chartbuilder.util.randomColorsRGB(selectedRivers.length);
            var colorHEX = nrl.chartbuilder.util.randomColorsHEX(selectedRivers.length);

            for (var i = 0; i < selectedRivers.length; i++) {
                var selRiver = selectedRivers[i];
                ret.series[selRiver.data.river] = {
                    name: nrl.chartbuilder.util.toTitleCase(selRiver.data.river),
                    data: [],
                    color: colorHEX[i],
                    lcolor: 'rgb(' + colorRGB[i] + ')',
                    type: 'column',
                    dataIndex: selRiver.data.river,
                    unit: uomLabel
                }
            }
        } else {
            // one serie for each selected region
            var selectedRegions, lenSelectedRegions;
            var granType = this.form.output.aoiFieldSet.gran_type.getValue().inputValue;
            if (granType == 'pakistan') {
                selectedRegions = [granType];
                lenSelectedRegions = selectedRegions.length;
            } else {
                selectedRegions = form.aoiFieldSet.selectedRegions.getValue().replace(/['\\]/g, '').split(',');
                lenSelectedRegions = form.aoiFieldSet.AreaSelector.getStore().getCount();
            }

            var colorRGB = nrl.chartbuilder.util.randomColorsRGB(lenSelectedRegions);
            var colorHEX = nrl.chartbuilder.util.randomColorsHEX(lenSelectedRegions);

            for (var i = 0; i < lenSelectedRegions; i++) {
                var selReg = selectedRegions[i];

                ret.series[selReg] = {
                    name: selReg,
                    data: [],
                    color: colorHEX[i],
                    lcolor: 'rgb(' + colorRGB[i] + ')',
                    type: 'column',
                    dataIndex: selReg,
                    unit: uomLabel
                }
            }
        }

        Ext.apply(options, ret);
        return ret;
    }
});

Ext.reg(gxp.widgets.button.NrlIrrigationChartButton.prototype.xtype, gxp.widgets.button.NrlIrrigationChartButton);