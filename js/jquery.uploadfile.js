/*!
 * jQuery Upload File Plugin
 * version: 4.0.10
 * @requires jQuery v1.5 or later & form plugin
 * Copyright (c) 2013 Ravishanker Kusuma
 * http://hayageek.com/
 */
(function ($) {
    var feature = {};
    feature.fileapi = $("<input type='file'/>").get(0).files !== undefined;
    feature.formdata = window.FormData !== undefined;
    $.fn.uploadFile = function (options) {
        // This is the easiest way to have default options.
        var s = $.extend({
            // These are the defaults.
            url: "",
            method: "POST",
            enctype: "multipart/form-data",
            returnType: null,
            allowDuplicates: true,
            duplicateStrict: false,
            allowedTypes: "*",
            //For list of acceptFiles
            // http://stackoverflow.com/questions/11832930/html-input-file-accept-attribute-file-type-csv
            acceptFiles: "*",
            fileName: "file",
            formData: false,
            dynamicFormData:false,
            maxFileSize: -1,
            maxFileCount: -1,
            multiple: true,
            dragDrop: true,
            autoSubmit: true,
            showCancel: true,
            showAbort: true,
            showDone: true,
            showDelete: false,
            showError: true,
            showStatusAfterSuccess: true,
            showStatusAfterError: true,
            showFileCounter: true,
            fileCounterStyle: "). ",
            showFileSize: true,
            showProgress: false,
            nestedForms: true,
            showDownload: false,
            onLoad: function (obj) {},
            onSelect: function (files) {
                return true;
            },
            showUploadQueue: function() {}, // PERSONNALISATION ITLDEV        
            onSubmit: function (files, xhr) {},
            onSuccess: function (files, response, xhr, pd) {},
            onError: function (files, status, message, xhr, pd) {},
            onCancel: function (files, pd) {},
            onAbort: function (files, pd) {},            
            downloadCallback: false,
            deleteCallback: false,
            afterUploadAll: false,
            serialize:true,
            sequential:false,
            sequentialCount:2,
            customProgressBar: false,
            abortButtonClass: "ajax-file-upload-abort",
            cancelButtonClass: "ajax-file-upload-cancel",
            dragDropContainerClass: "ajax-upload-dragdrop",
            dragDropHoverClass: "state-hover",
            errorClass: "ajax-file-upload-error",
            uploadButtonClass: "ajax-file-upload",
            dragDropStr: "<span><b>Drag &amp; Drop Files</b></span>",
            uploadStr:"Upload",
            abortStr: "Abort",
            cancelStr: "Cancel",
            deletelStr: "Delete",
            doneStr: "Done",
            multiDragErrorStr: "Multiple File Drag &amp; Drop is not allowed.",
            extErrorStr: "is not allowed. Allowed extensions: ",
            duplicateErrorStr: "is not allowed. File already exists.",
            sizeErrorStr: "is not allowed. Allowed Max size: ",
            uploadErrorStr: "Upload is not allowed",
            maxFileCountErrorStr: " is not allowed. Maximum allowed files are:",
            downloadStr: "Download",
            customErrorKeyStr: "jquery-upload-file-error",
            showQueueDiv: false,
            statusBarWidth: 400,
            dragdropWidth: 400,
            showPreview: false,
            previewHeight: "auto",
            previewWidth: "100%",
            extraHTML:false,
            uploadQueueOrder:'top'
        }, options);

        this.options = s;
        this.dragging = 0; // comptabilise le nb de drag. Personnalisation ITL
        this.fileCounter = 1;
        this.selectedFiles = 0;
        
        this.itlCptSuccess = 0; // PERSONNALISATION ITLDEV 
        this.itlCptTotal = 0; // PERSONNALISATION ITLDEV 

        var formGroup = "ajax-file-upload-" + (new Date().getTime());
        this.formGroup = formGroup;
        this.errorLog = $("<div></div>"); //Writing errors
        this.responses = [];
        this.existingFileNames = [];
        if(!feature.formdata) //check drag drop enabled.
        {
            s.dragDrop = false;
        }
        if(!feature.formdata || s.maxFileCount === 1) {
            s.multiple = false;
        }

        $(this).html("");

        var obj = this;
        
        var uploadLabel = $('<div>' + s.uploadStr + '</div>');

        $(uploadLabel).addClass(s.uploadButtonClass);
        
        // wait form ajax Form plugin and initialize
        (function checkAjaxFormLoaded() {
            if($.fn.ajaxForm) {

                if(s.dragDrop) {
                	var dragDrop;
			        if(dragDrop = $('.' + s.dragDropContainerClass)) {
			            $(obj).append(uploadLabel);
			        } else {
			            dragDrop = $('<div class="' + s.dragDropContainerClass + '" style="vertical-align:top;"></div>').width(s.dragdropWidth);
			            $(obj).append(dragDrop);
			            $(dragDrop).append(uploadLabel);
			            $(dragDrop).append($(s.dragDropStr));
			        }
		            setDragDropHandlers(obj, s, dragDrop);
                } else {
                    $(obj).append(uploadLabel);
                }
                $(obj).append(obj.errorLog);
                
   				if(s.showQueueDiv)
		        	obj.container =$("#"+s.showQueueDiv);
        		else
		            obj.container = $("<div class='ajax-file-upload-container'></div>").insertAfter($(obj));
        
                s.onLoad.call(this, obj);
                createCustomInputFile(obj, formGroup, s, uploadLabel);

            } else window.setTimeout(checkAjaxFormLoaded, 10);
        })();

	   this.startUpload = function () {
	   		$("form").each(function(i,items)
	   		{
	   			if($(this).hasClass(obj.formGroup))
	   			{
					mainQ.push($(this));
	   			}
	   		});

            if(mainQ.length >= 1 )
	 			submitPendingUploads();

        }

        this.getFileCount = function () {
            return obj.selectedFiles;

        }
        
        this.stopUpload = function () {
            $("." + s.abortButtonClass).each(function (i, items) {
                if($(this).hasClass(obj.formGroup)) $(this).click();
            });
             $("." + s.cancelButtonClass).each(function (i, items) {
                if($(this).hasClass(obj.formGroup)) $(this).click();
            });
        }
        this.cancelAll = function () {
            $("." + s.cancelButtonClass).each(function (i, items) {
                if($(this).hasClass(obj.formGroup)) $(this).click();
            });
        }
        this.update = function (settings) {
            //update new settings
            s = $.extend(s, settings);
        }
        this.reset = function (removeStatusBars) {
                        obj.fileCounter = 1;
			obj.selectedFiles = 0;
			obj.errorLog.html("");
					//remove all the status bars.
			if(removeStatusBars != false)
			{
				obj.container.html("");
			}
        }
		this.remove = function()
		{
			obj.container.html("");
			$(obj).remove();
	
		}
        //This is for showing Old files to user.
        this.createProgress = function (filename,filepath,filesize) {
            var pd = new createProgressDiv(this, s);
            pd.progressDiv.show();
            pd.progressbar.width('100%');

            var fileNameStr = "";
            if(s.showFileCounter) 
            	fileNameStr = obj.fileCounter + s.fileCounterStyle + filename;
            else fileNameStr = filename;
            
            
            if(s.showFileSize)
				fileNameStr += " ("+getSizeStr(filesize)+")";


            pd.filename.html(fileNameStr);
            obj.fileCounter++;
            obj.selectedFiles++;
            obj.itlCptTotal++; // PERSONNALISATION ITLDEV
            
            if(s.showPreview)
            {
                pd.preview.attr('src',filepath);
                pd.preview.show();
            }
            
            if(s.showDownload) {
                pd.download.show();
                pd.download.click(function () {
                    if(s.downloadCallback) s.downloadCallback.call(obj, [filename]);
                });
            }
            if(s.showDelete)
            {
	            pd.del.show();
    	        pd.del.click(function () {
        	        pd.statusbar.hide().remove();
            	    var arr = [filename];
                	if(s.deleteCallback) s.deleteCallback.call(this, arr, pd);
	                obj.selectedFiles -= 1;
    	            updateFileCounter(s, obj);
        	    });
            }

            return pd;
        }

        this.getResponses = function () {
            return this.responses;
        }
        // PERSONNALISATION ITLDEV
        this.isAjaxInProgress = function () {
            return (mainQ.length!==0);
        }
        //
        var mainQ=[];
        var progressQ=[]
        var running = false;
          function submitPendingUploads() {
			if(running) return;
			running = true;
            (function checkPendingForms() {
                
                	//if not sequential upload all files
                	if(!s.sequential) s.sequentialCount=99999;
                	
					if(mainQ.length == 0 &&   progressQ.length == 0)
					{
						if(s.afterUploadAll) s.afterUploadAll(obj);
						running= false;
					}              
					else 
					{
						if( progressQ.length < s.sequentialCount)
						{
							var frm = mainQ.shift();
							if(frm != undefined)
							{
				    	    	progressQ.push(frm);
				    	    	//Remove the class group.
				    	    	frm.removeClass(obj.formGroup);
    	    					frm.submit();
        					}
						}						
						window.setTimeout(checkPendingForms, 1000);
					}
                })();
        }
        
        function setDragDropHandlers(obj, s, ddObj) {
            ddObj.on('dragenter', function (e) {
                obj.dragging++;
                e.stopPropagation();
                e.preventDefault();
                $(this).addClass(s.dragDropHoverClass);
                $('#' + s.dragDropHoverClass + 'Mask').show();
            });
            ddObj.on('dragover', function (e) {
                e.stopPropagation();
                e.preventDefault();
                var that = $(this);
                if (that.hasClass(s.dragDropContainerClass) && !that.hasClass(s.dragDropHoverClass)) {
                    that.addClass(s.dragDropHoverClass);
                    $('#' + s.dragDropHoverClass + 'Mask').show();
                }
            });
            ddObj.on('drop', function (e) {
                obj.dragging=0;
                e.preventDefault();
                $(this).removeClass(s.dragDropHoverClass);
                $('#' + s.dragDropHoverClass + 'Mask').hide(); // Personnalisation ITL
                obj.errorLog.html("");
                var files = e.originalEvent.dataTransfer.files;
                if(!s.multiple && files.length > 1) {
                    if(s.showError) {
                        // Personnalisation ITLDEV
                        var err = $("<div class='" + s.errorClass + "'>" + s.multiDragErrorStr + "</div>");
                        manageError(obj, err, s);
                    }
                    return;
                }
                if(s.onSelect(files) == false) return;
                serializeAndUploadFiles(s, obj, files);
            });
            ddObj.on('dragleave', function (e) { // Personnalisation ITL
                obj.dragging--;
                if (obj.dragging <= 0) {
                    $(this).removeClass(s.dragDropHoverClass);
                    $('#' + s.dragDropHoverClass + 'Mask').hide();
                }
            });
	}
        function getSizeStr(size) {
            var sizeStr = "";
            var sizeKB = size / 1024;
            if(parseInt(sizeKB) > 1024) {
                var sizeMB = sizeKB / 1024;
                sizeStr = sizeMB.toFixed(2) + " MB";
            } else {
                sizeStr = sizeKB.toFixed(2) + " KB";
            }
            return sizeStr;
        }

        function serializeData(extraData) {
            var serialized = [];
            if(jQuery.type(extraData) == "string") {
                serialized = extraData.split('&');
            } else {
                serialized = $.param(extraData).split('&');
            }
            var len = serialized.length;
            var result = [];
            var i, part;
            for(i = 0; i < len; i++) {
                serialized[i] = serialized[i].replace(/\+/g, ' ');
                part = serialized[i].split('=');
                result.push([decodeURIComponent(part[0]), decodeURIComponent(part[1])]);
            }
            return result;
        }
		function noserializeAndUploadFiles(s, obj, files) {
		    var ts = s;
                var fd = new FormData();
                var fileArray = [];
                var fileName = s.fileName.replace("[]", "");
				var fileListStr="";                
                
                for (var i = 0; i < files.length; i++) {
                if (!isFileTypeAllowed(obj, s, files[i].name)) {
                    if (s.showError){
                        // Personnalisation Itldev TF
                        var err = $("<div class='" + s.errorClass + "'><b>" + files[i].name + "</b> " + s.extErrorStr + s.allowedTypes + "</div>");
                        manageError(obj, err, s);
                    }
                    continue;
                }
                if (s.maxFileSize != -1 && files[i].size > s.maxFileSize) {
                    if(s.showError) {
                        // Personnalisation Itldev TF
                        err = $("<div class='" + s.errorClass + "'><b>" + files[i].name + "</b> " + s.sizeErrorStr + " " + getSizeStr(s.maxFileSize) + "</div>");
                        manageError(obj, err, s);
                    }
                    continue;
                }
	                fd.append(fileName+"[]", files[i]);
	                fileArray.push(files[i].name);
	                fileListStr += obj.fileCounter + "). " + files[i].name+"<br>";
    	            obj.fileCounter++;
            	}
				if(fileArray.length ==0 ) return;
				
            	var extraData = s.formData;
                if (extraData) {
                    var sData = serializeData(extraData);
                    for (var j = 0; j < sData.length; j++) {
                        if (sData[j]) {
                            fd.append(sData[j][0], sData[j][1]);
                        }
                    }
                }

            	
                ts.fileData = fd;
                var pd = new createProgressDiv(obj, s);
                pd.filename.html(fileListStr);
                var form = $("<form style='display:block; position:absolute;left: 150px;' class='" + obj.formGroup + "' method='" + s.method + "' action='" + s.url + "' enctype='" + s.enctype + "'></form>");
                form.appendTo('body');
                ajaxFormSubmit(form, ts, pd, fileArray, obj);

		}


        function serializeAndUploadFiles(s, obj, files) {
            for(var i = 0; i < files.length; i++) {
                if(!isFileTypeAllowed(obj, s, files[i].name)) {
                    if(s.showError) {
                        // Personnalisation Itldev TF
                        var err = $("<div class='" + s.errorClass + "'><b>" + files[i].name + "</b> " + s.extErrorStr + s.allowedTypes + "</div>");
                        manageError(obj, err, s);
                    }
                    continue;
                }
                if(!s.allowDuplicates && isFileDuplicate(obj, files[i].name)) {
                    if(s.showError) {
                        // Personnalisation Itldev TF
                        var err = $("<div class='" + s.errorClass + "'><b>" + files[i].name + "</b> " + s.duplicateErrorStr + "</div>");
                        manageError(obj, err, s);
                    }
                    continue;
                }
                if(s.maxFileSize != -1 && files[i].size > s.maxFileSize) {
                    if(s.showError) {
                        // Personnalisation Itldev TF
                        err = $("<div class='" + s.errorClass + "'><b>" + files[i].name + "</b> " + s.sizeErrorStr + " " + getSizeStr(s.maxFileSize) + "</div>");
                        manageError(obj, err, s);
                    }
                    continue;
                }
                if(s.maxFileCount != -1 && obj.selectedFiles >= s.maxFileCount) {
                    if(s.showError) {
                        // Personnalisation Itldev TF
                        var err = $("<div class='" + s.errorClass + "'><b>" + files[i].name + "</b> " + s.maxFileCountErrorStr + " " + s.maxFileCount + "</div>");
                        manageError(obj, err, s);
                    }
                    continue;
                }
                obj.selectedFiles++;
                
                obj.itlCptTotal++; // PERSONNALISATION ITLDEV
                
                obj.existingFileNames.push(files[i].name);
                var ts = s;
                var fd = new FormData();
                var fileName = s.fileName.replace("[]", "");
                fd.append(fileName, files[i]);
                var extraData = s.formData;
                if(extraData) {
                    var sData = serializeData(extraData);
                    for(var j = 0; j < sData.length; j++) {
                        if(sData[j]) {
                            fd.append(sData[j][0], sData[j][1]);
                        }
                    }
                }
                ts.fileData = fd;

                var pd = new createProgressDiv(obj, s);
                var fileNameStr = "";
                if(s.showFileCounter) fileNameStr = obj.fileCounter + s.fileCounterStyle + files[i].name
                else fileNameStr = files[i].name;

				if(s.showFileSize)
				fileNameStr += " ("+getSizeStr(files[i].size)+")";
				
				pd.filename.html(fileNameStr);
                var form = $("<form style='display:block; position:absolute;left: 150px;' class='" + obj.formGroup + "' method='" + s.method + "' action='" +
                    s.url + "' enctype='" + s.enctype + "'></form>");
                form.appendTo('body');
                var fileArray = [];
                fileArray.push(files[i].name);
                ajaxFormSubmit(form, ts, pd, fileArray, obj, files[i]);
                obj.fileCounter++;
            }
        }

        function isFileTypeAllowed(obj, s, fileName) {
            var fileExtensions = s.allowedTypes.toLowerCase().split(/[\s,]+/g);
            var ext = fileName.split('.').pop().toLowerCase();
            if(s.allowedTypes != "*" && jQuery.inArray(ext, fileExtensions) < 0) {
                return false;
            }
            return true;
        }

        function isFileDuplicate(obj, filename) {
            var duplicate = false;
            if (obj.existingFileNames.length) {
                for (var x=0; x<obj.existingFileNames.length; x++) {
                    if (obj.existingFileNames[x] == filename
                        || s.duplicateStrict && obj.existingFileNames[x].toLowerCase() == filename.toLowerCase()
                    ) {
                        duplicate = true;
                    }
                }
            }
            return duplicate;
        }

        function removeExistingFileName(obj, fileArr) {
            if (obj.existingFileNames.length) {
                for (var x=0; x<fileArr.length; x++) {
                    var pos = obj.existingFileNames.indexOf(fileArr[x]);
                    if (pos != -1) {
                        obj.existingFileNames.splice(pos, 1);
                    }
                }
            }
        }

        function getSrcToPreview(file, obj) {
            if(file) {
                obj.show();
                var reader = new FileReader();
                reader.onload = function (e) {
                    obj.attr('src', e.target.result);
                };
                reader.readAsDataURL(file);
            }
        }

        function updateFileCounter(s, obj) {
            if(s.showFileCounter) {
                var count = $(obj.container).find(".ajax-file-upload-filename").length;
                obj.fileCounter = count + 1;
                $(obj.container).find(".ajax-file-upload-filename").each(function (i, items) {
                    var arr = $(this).html().split(s.fileCounterStyle);
                    var fileNum = parseInt(arr[0]) - 1; //decrement;
                    var name = count + s.fileCounterStyle + arr[1];
                    $(this).html(name);
                    count--;
                });
            }
        }

        function createCustomInputFile (obj, group, s, uploadLabel) {

            var fileUploadId = "ajax-upload-id-" + (new Date().getTime());

            var form = $("<form method='" + s.method + "' action='" + s.url + "' enctype='" + s.enctype + "'></form>");
            var fileInputStr = "<input type='file' id='" + fileUploadId + "' name='" + s.fileName + "' accept='" + s.acceptFiles + "'/>";
            if(s.multiple) {
                if(s.fileName.indexOf("[]") != s.fileName.length - 2) // if it does not endwith
                {
                    s.fileName += "[]";
                }
                fileInputStr = "<input type='file' id='" + fileUploadId + "' name='" + s.fileName + "' accept='" + s.acceptFiles + "' multiple/>";
            }
            var fileInput = $(fileInputStr).appendTo(form);

            fileInput.change(function () {

                obj.errorLog.html("");
                var fileExtensions = s.allowedTypes.toLowerCase().split(",");
                var fileArray = [];
                if(this.files) //support reading files
                {
                    for(i = 0; i < this.files.length; i++) {
                        fileArray.push(this.files[i].name);
                    }

                    if(s.onSelect(this.files) == false) return;
                } else {
                    var filenameStr = $(this).val();
                    var flist = [];
                    fileArray.push(filenameStr);
                    if(!isFileTypeAllowed(obj, s, filenameStr)) {
                        if(s.showError) {
                            // Personnalisation ITLDEV
                            var err = $("<div class='" + s.errorClass + "'><b>" + filenameStr + "</b> " + s.extErrorStr + s.allowedTypes + "</div>");
                            manageError(obj, err, s);
                        }
                        return;
                    }
                    //fallback for browser without FileAPI
                    flist.push({
                        name: filenameStr,
                        size: 'NA'
                    });
                    if(s.onSelect(flist) == false) return;

                }
                updateFileCounter(s, obj);

                uploadLabel.unbind("click");
                form.hide();
                createCustomInputFile(obj, group, s, uploadLabel);
                form.addClass(group);
                if(s.serialize && feature.fileapi && feature.formdata) //use HTML5 support and split file submission
                {
                    form.removeClass(group); //Stop Submitting when.
                    var files = this.files;
                    form.remove();
                    serializeAndUploadFiles(s, obj, files);
                } else {
                    var fileList = "";
                    for(var i = 0; i < fileArray.length; i++) {
                        if(s.showFileCounter) fileList += obj.fileCounter + s.fileCounterStyle + fileArray[i] + "<br>";
                        else fileList += fileArray[i] + "<br>";;
                        obj.fileCounter++;

                    }
                    if(s.maxFileCount != -1 && (obj.selectedFiles + fileArray.length) > s.maxFileCount) {
                        if(s.showError) {
                            // Personnalisation ITLDEV
                            var err = $("<div class='" + s.errorClass + "'><b>" + fileList + "</b> " + s.maxFileCountErrorStr + s.maxFileCount + "</div>");
                            manageError(obj, err, s);
                        }
                        return;
                    }
                    obj.selectedFiles += fileArray.length;

                    var pd = new createProgressDiv(obj, s);
                    pd.filename.html(fileList);
                    ajaxFormSubmit(form, s, pd, fileArray, obj, null);
                }



            });

            if(s.nestedForms) {
                form.css({
                    'margin': 0,
                    'padding': 0
                });
                uploadLabel.css({
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'default'
                });
                fileInput.css({
                    position: 'absolute',
                    'cursor': 'pointer',
                    'top': '0px',
                    'width': '100%',
                    'height': '100%',
                    'left': '0px',
                    'z-index': '100',
                    'opacity': '0.0',
                    'filter': 'alpha(opacity=0)',
                    '-ms-filter': "alpha(opacity=0)",
                    '-khtml-opacity': '0.0',
                    '-moz-opacity': '0.0'
                });
                form.appendTo(uploadLabel);

            } else {
                form.appendTo($('body'));
                form.css({
                    margin: 0,
                    padding: 0,
                    display: 'block',
                    position: 'absolute',
                    left: '-250px'
                });
                if(navigator.appVersion.indexOf("MSIE ") != -1) //IE Browser
                {
                    uploadLabel.attr('for', fileUploadId);
                } else {
                    uploadLabel.click(function () {
                        fileInput.click();
                    });
                }
            }
        }
       // Personnalisation ITL
        function manageError(obj, err, s) {
            if (s.showQueueDiv) {
                var sb = $("<div class='ajax-file-upload-statusbar'></div>");
                err.appendTo(sb);
                obj.container.prepend(sb);
                s.showUploadQueue.call();
            } else {
                err.appendTo(obj.errorLog);
            }
        }


		function defaultProgressBar(obj,s)
		{
		
			this.statusbar = $("<div class='ajax-file-upload-statusbar'></div>").width(s.statusBarWidth);
            this.preview = $("<img class='ajax-file-upload-preview' />").width(s.previewWidth).height(s.previewHeight).appendTo(this.statusbar).hide();
            this.filename = $("<div class='ajax-file-upload-filename'></div>").appendTo(this.statusbar);
            this.progressDiv = $("<div class='ajax-file-upload-progress'>").appendTo(this.statusbar).hide();
            this.progressbar = $("<div class='ajax-file-upload-bar'></div>").appendTo(this.progressDiv);
            this.abort = $("<div>" + s.abortStr + "</div>").appendTo(this.statusbar).hide();
            this.cancel = $("<div>" + s.cancelStr + "</div>").appendTo(this.statusbar).hide();
            this.done = $("<div>" + s.doneStr + "</div>").appendTo(this.statusbar).hide();
            this.download = $("<div>" + s.downloadStr + "</div>").appendTo(this.statusbar).hide();
            this.del = $("<div>" + s.deletelStr + "</div>").appendTo(this.statusbar).hide();

            this.abort.addClass("ajax-file-upload-red");
            this.done.addClass("ajax-file-upload-green");
			this.download.addClass("ajax-file-upload-green");            
            this.cancel.addClass("ajax-file-upload-red");
            this.del.addClass("ajax-file-upload-red");
            // PERSONNALISATION ITLDEV
            this.abort.addClass("ajax-file-upload-btn");
            this.done.addClass("ajax-file-upload-btn itlUploadBtnAbort"); // itlUploadBtnAbort obligatoire
            this.cancel.addClass("ajax-file-upload-btn");
            
			return this;
		}
        function createProgressDiv(obj, s) {
	        var bar = null;
        	if(s.customProgressBar)
        		bar =  new s.customProgressBar(obj,s);
        	else
        		bar =  new defaultProgressBar(obj,s);

			bar.abort.addClass(obj.formGroup);
            bar.abort.addClass(s.abortButtonClass);        	

            bar.cancel.addClass(obj.formGroup);
            bar.cancel.addClass(s.cancelButtonClass);
            
            if(s.extraHTML)
	            bar.extraHTML = $("<div class='extrahtml'>"+s.extraHTML()+"</div>").insertAfter(bar.filename);    	
            
            if(s.uploadQueueOrder == 'bottom')
				$(obj.container).append(bar.statusbar);
			else
				$(obj.container).prepend(bar.statusbar);
            return bar;
        }


        function ajaxFormSubmit(form, s, pd, fileArray, obj, file) {
            var currentXHR = null;
            var options = {
                cache: false,
                contentType: false,
                processData: false,
                forceSync: false,
                type: s.method,
                data: s.formData,
                formData: s.fileData,
                dataType: s.returnType,
                beforeSubmit: function (formData, $form, options) {
                    if(s.onSubmit.call(this, fileArray) != false) {
                        if(s.dynamicFormData) 
                        {
                            var sData = serializeData(s.dynamicFormData());
                            if(sData) {
                                for(var j = 0; j < sData.length; j++) {
                                    if(sData[j]) {
                                        if(s.fileData != undefined) options.formData.append(sData[j][0], sData[j][1]);
                                        else options.data[sData[j][0]] = sData[j][1];
                                    }
                                }
                            }
                        }

                     if(s.extraHTML)
                        {
                        	$(pd.extraHTML).find("input,select,textarea").each(function(i,items)
                        	{
                        		    if(s.fileData != undefined) options.formData.append($(this).attr('name'),$(this).val());
                                        else options.data[$(this).attr('name')] = $(this).val();
                        	});
                        }
                        return true;
                    }
                    pd.statusbar.append("<div class='" + s.errorClass + "'>" + s.uploadErrorStr + "</div>");
                    pd.cancel.show()
                    form.remove();
                    pd.cancel.click(function () {
                    	 mainQ.splice(mainQ.indexOf(form), 1);
                        removeExistingFileName(obj, fileArray);
                        pd.statusbar.remove();
                        s.onCancel.call(obj, fileArray, pd);
                        obj.selectedFiles -= fileArray.length; //reduce selected File count
                        updateFileCounter(s, obj);
                    });
                    return false;
                },
                beforeSend: function (xhr, o) {

                    pd.progressDiv.show();
                    pd.cancel.hide();
                    pd.done.hide();
                    if(s.showAbort) {
                        pd.abort.show();
                        pd.abort.click(function () {
                            removeExistingFileName(obj, fileArray);
                            xhr.abort();
                            obj.selectedFiles -= fileArray.length; //reduce selected File count
                            obj.itlCptTotal--; // PERSONNALISATION ITLDEV
                            s.onAbort.call(obj, fileArray, pd);

                        });
                    }
                    if(!feature.formdata) //For iframe based push
                    {
                        pd.progressbar.width('5%');
                    } else pd.progressbar.width('1%'); //Fix for small files
                },
                uploadProgress: function (event, position, total, percentComplete) {
                    //Fix for smaller file uploads in MAC
                    if(percentComplete > 98) percentComplete = 98;

                    var percentVal = percentComplete + '%';
                    if(percentComplete > 1) pd.progressbar.width(percentVal)
                    if(s.showProgress) {
                        pd.progressbar.html(percentVal);
                        pd.progressbar.css('text-align', 'center');
                    }

                },
                success: function (data, message, xhr) {
                	pd.cancel.remove();
                	progressQ.pop();
                    //For custom errors.
                    if(s.returnType == "json" && $.type(data) == "object" && data.hasOwnProperty(s.customErrorKeyStr)) {
                        pd.abort.hide();
                        var msg = data[s.customErrorKeyStr];
                        // PERSONNALISATION ITLDEV - traitement de l'erreur Koya dans le s.onErrorCall
                        var itlError=s.onError.call(this, fileArray, 200, msg, xhr, pd);
                        if(s.showStatusAfterError) {
                            pd.progressDiv.hide();
                            if(!itlError) pd.statusbar.append("<span class='" + s.errorClass + "'>ERROR 1: " + msg + "</span>");
                        } else {
                            pd.statusbar.hide();
                            pd.statusbar.remove();
                        }
                        obj.selectedFiles -= fileArray.length; //reduce selected File count
                        form.remove();
                        return;
                    }
                    obj.responses.push(data);
                    pd.progressbar.width('100%')
                    if(s.showProgress) {
                        pd.progressbar.html('100%');
                        pd.progressbar.css('text-align', 'center');
                    }

                    pd.abort.hide();
                    
                    obj.itlCptSuccess++;
                    
                    s.onSuccess.call(this, fileArray, data, xhr, pd);
                    if(s.showStatusAfterSuccess) {
                        if(s.showDone) {
                            pd.done.show();
                            pd.done.click(function () {
                                pd.statusbar.hide("slow");
                                pd.statusbar.remove();
                            });
                        } else {
                            pd.done.hide();
                        }
                        if(s.showDelete) {
                            pd.del.show();
                            pd.del.click(function () {
		                        removeExistingFileName(obj, fileArray);
                                pd.statusbar.hide().remove();
                                if(s.deleteCallback) s.deleteCallback.call(this, data, pd);
                                obj.selectedFiles -= fileArray.length; //reduce selected File count
                                updateFileCounter(s, obj);

                            });
                        } else {
                            pd.del.hide();
                        }
                    } else {
                        pd.statusbar.hide("slow");
                        pd.statusbar.remove();

                    }
                    if(s.showDownload) {
                        pd.download.show();
                        pd.download.click(function () {
                            if(s.downloadCallback) s.downloadCallback(data);
                        });
                    }
                    form.remove();

                },
                error: function (xhr, status, errMsg) {
                	pd.cancel.remove();
                	progressQ.pop();
                    pd.abort.hide();
                    if(xhr.statusText == "abort") //we aborted it
                    {
                        pd.statusbar.hide("slow").remove();
                        updateFileCounter(s, obj);

                    } else {
                        // PERSONNALISATION ITLDEV - Gestion de l'erreur
                        // Réaffichage bouton abort pour retirer le fichier de la queue
                        // pd.abort.show();
                         // pd.abort.click(function () {
                         //  pd.statusbar.hide("slow");
                        //    pd.statusbar.remove();
                        // });

                        var itlError=s.onError.call(this, fileArray, status, errMsg, xhr, pd);
                        if(s.showStatusAfterError) {
                            pd.progressDiv.hide();
                            if(!itlError) pd.statusbar.append("<span class='" + s.errorClass + "'>ERROR 2: " + errMsg + "</span>");
                        } else {
                            pd.statusbar.hide();
                            pd.statusbar.remove();
                        }
                        obj.selectedFiles -= fileArray.length; //reduce selected File count
                    }

                    form.remove();
                }
            };

            if(s.showPreview && file != null) {
                if(file.type.toLowerCase().split("/").shift() == "image") getSrcToPreview(file, pd.preview);
            }
            
            
            if(s.showCancel) {
                pd.cancel.show();
                pd.cancel.click(function () {
                    mainQ.splice(mainQ.indexOf(form), 1);
                    removeExistingFileName(obj, fileArray);
                    form.remove();
                    pd.statusbar.remove();
                    obj.itlCptTotal --;
                    s.onCancel.call(obj, fileArray, pd);
                    obj.selectedFiles -= fileArray.length; //reduce selected File count
                    updateFileCounter(s, obj);
                });
            }
            form.ajaxForm(options);
            if(s.autoSubmit) {
                mainQ.push(form);
                submitPendingUploads();
            }
        }
        return this;

    }
}(jQuery));
