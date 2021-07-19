// ==========================================================================

// Comments Plugin for Craft CMS
// Author: Verbb - https://verbb.io/

// ==========================================================================

// @codekit-prepend "_base.js"

Comments = {};

Comments.translations = {};

Comments.Base = Base.extend({
    addClass: function(el, className) {
        if (el.classList) {
            el.classList.add(className);
        } else {
            el.className += ' ' + className;
        }
    },

    removeClass: function(el, className) {
        if (el.classList) {
            el.classList.remove(className);
        } else {
            el.className = el.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
        }
    },

    toggleClass: function(el, className) {
        if (el.classList) {
            el.classList.toggle(className);
        } else {
            var classes = el.className.split(' ');
            var existingIndex = classes.indexOf(className);

            if (existingIndex >= 0) {
                classes.splice(existingIndex, 1);
            } else {
                classes.push(className);
            }

            el.className = classes.join(' ');
        }
    },

    createElement: function(html) {
        var el = document.createElement('div');
        el.innerHTML =  html;
        return el.firstChild;
    },

    serialize: function(form) {
        var formData = new FormData(form);

        // Set CSRF to each request, just in case
        formData.set(Comments.csrfTokenName, Comments.csrfToken);

        return formData;
    },

    serializeObject: function(json) {
        var qs = Object.keys(json).map(function(key) { 
            return encodeURIComponent(key) + '=' + encodeURIComponent(json[key]);
        });

        // Add CSRF to each request
        qs.push(encodeURIComponent(Comments.csrfTokenName) + "=" + encodeURIComponent(Comments.csrfToken));

        return qs.join('&');
    },

    ajax: function(url, settings) {
        settings = settings || {};

        var xhr = new XMLHttpRequest();
        xhr.open(settings.method || 'GET', url, true);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.setRequestHeader('Accept', 'application/json');

        if (settings.contentType != 'formData') {
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        }

        xhr.onreadystatechange = function (state) {
            if (xhr.readyState === 4) {
                try {
                    var response = JSON.parse(xhr.responseText);

                    if (xhr.status === 200 && settings.success) {
                        if (response.errors) {
                            settings.error(response);
                        } else {
                            settings.success(response);
                        }
                    } else if (xhr.status != 200 && settings.error) {
                        if (response.error) {
                            response = [[response.error]];
                        }

                        settings.error(response);
                    }
                } catch(e) {
                    settings.error([e]);
                }
            }
        };

        xhr.send(settings.data || '');
    },

    addListener: function($element, event, func, useCapture) {
        if ($element) {
            $element.addEventListener(event, func.bind(this), useCapture || true);
        }
    },

    remove: function($element) {
        if ($element) {
            $element.parentNode.removeChild($element);
        }
    },

    clearNotifications: function($element) {
        var $elements = $element.querySelectorAll('[data-role="notice"], [data-role="errors"]');

        if ($elements) {
            Array.prototype.forEach.call($elements, function(el, i) {
                el.innerHTML = '';
            });
        }
    },

    setNotifications: function(type, $element, content) {
        if (content && $element) {
            if (type === 'error') {
                var errors = content.errors || content;

                Object.keys(errors).forEach(function(key) {
                    $element.querySelector('[data-role="errors"]').innerHTML = errors[key][0];
                });
            } else if (type === 'validation') {
                Object.keys(content).forEach(function(key) {
                    var $field = $element.querySelector('[name="fields[' + key + ']"]');

                    if (!$field) {
                        $field = $element.querySelector('[name="fields[' + key + '][]"]');
                    }

                    if ($field) {
                        $field.nextElementSibling.innerHTML = content[key][0];
                    }
                });
            } else {
                $element.querySelector('[data-role="notice"]').innerHTML = content;
            }
        }
    },

    checkCaptcha: function(formData, callback) {
        // Only trigger if reCAPTCHA enabled
        if (!Comments.recaptchaEnabled) {
            return callback(formData, this);
        }

        // Check for reCAPTCHA
        grecaptcha.execute(Comments.recaptchaKey, { action: 'commentForm' }).then(function(token) {
            // Append value to the form and proceed
            formData.append('g-recaptcha-response', token);

            return callback(formData, this);
        });
    },

    postForm: function(e, url, callback) {
        var $form = e.target;
        var data = this.serialize($form);
        var $btn = $form.querySelector('[type="submit"]');

        this.clearNotifications($form);
        this.addClass($btn, 'loading');

        this.checkCaptcha(data, function(data) {
            this.ajax(Comments.baseUrl + url, {
                method: 'POST',
                contentType: 'formData',
                data: data,
                success: function(xhr) {
                    this.removeClass($btn, 'loading');

                    if (xhr.notice) {
                        this.setNotifications('notice', $form, xhr.notice);
                    }

                    if (xhr.success) {
                        callback(xhr);
                    } else {
                        this.setNotifications('validation', $form, xhr.errors);
                    }
                }.bind(this),
                error: function(xhr) {
                    this.removeClass($btn, 'loading');
                    this.setNotifications('validation', $form, xhr.errors);
                }.bind(this)
            });
        }.bind(this));
    },

    t: function(key) {
        return (Comments.translations.hasOwnProperty(key)) ? Comments.translations[key] : '';
    },
	
	makeUniqueID(prefix = 'ID') {
		var d = new Date().getTime();

		if( window.performance && typeof window.performance.now === "function" ) {
			d += performance.now();
		}

		var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = (d + Math.random()*16)%16 | 0;
			d = Math.floor(d/16);
			return (c=='x' ? r : (r&0x3|0x8)).toString(16);
		});

		return prefix + '_' + uuid;
	},

    find: function(node, selector) {
        removeId = false;

        if (node.getAttribute('id') === null) {
            node.setAttribute('id', this.makeUniqueID());
            removeId = true;
        }

        let result = document.querySelector('#' + node.getAttribute('id') + ' > ' + selector);

        if (removeId) {
            node.removeAttribute('id');
        }

        return result;
    },
});

Comments.Instance = Comments.Base.extend({
    comments: {},

    init: function(id, settings) {
        this.settings = settings;

        var $container = document.querySelector(id);
        var $comments = $container.querySelectorAll('[data-role="comment"]');

        // Setup some global variables
        Comments.baseUrl = settings.baseUrl + '/comments/comments/';
        Comments.csrfTokenName = settings.csrfTokenName;
        Comments.csrfToken = settings.csrfToken;
        Comments.translations = settings.translations;
        Comments.recaptchaEnabled = settings.recaptchaEnabled;
        Comments.recaptchaKey = settings.recaptchaKey;

        this.$commentsContainer = $container.querySelector('[data-role="comments"]');
        this.$baseForm = $container.querySelector('[data-role="form"]');

        // Actions
        this.$subscribeBtn = $container.querySelector('[data-action="subscribe"]');

        this.addListener(this.$baseForm, 'submit', this.onSubmit, false);
        this.addListener(this.$subscribeBtn, 'click', this.subscribe);

        // Create classes for each comment item
        for (var i = 0; i < $comments.length; i++) {
            var id = $comments[i].getAttribute('data-id');

            this.comments[id] = new Comments.Comment(this, $comments[i]);
        }

        // Update the CSRF token from the form. This plays nicely with Blitz.
        setTimeout(function() {
            var $csrfTokenInput = this.$baseForm.querySelector('[name="' + Comments.csrfTokenName + '"]');

            if ($csrfTokenInput) {
                Comments.csrfToken = $csrfTokenInput.value;
            }
        }.bind(this), 2000);
    },

    onSubmit: function(e) {
        e.preventDefault();

        this.postForm(e, 'save', function(xhr) {

            if (xhr.html) {
                var $html = this.createElement(xhr.html);
                var $newComment = this.$commentsContainer.insertBefore($html, this.$commentsContainer.firstChild);

                this.comments[xhr.id] = new Comments.Comment(this, $html);

                this.$baseForm.querySelector('form').reset();

                // Scroll to the new comment
                location.hash = '#comment-' + xhr.id;
            }

            // If a comment was successfully submitted but under review
            if (xhr.success) {
                this.$baseForm.querySelector('form').reset();
            }

        }.bind(this));
    },

    subscribe: function(e) {
        e.preventDefault();

        var ownerId = this.settings.element.id;
        var siteId = this.settings.element.siteId;

        var $commentHeader = this.$subscribeBtn.parentNode;

        this.clearNotifications($commentHeader);

        this.toggleClass(this.$subscribeBtn, 'is-subscribed');

        this.ajax(Comments.baseUrl + 'subscribe', {
            method: 'POST',
            data: this.serializeObject({ ownerId: ownerId, siteId: siteId }),
            success: function(xhr) {
                if (!xhr.success) {
                    throw new Error(xhr);
                }
            }.bind(this),
            error: function(response) {
                if (response.errors) {
                    this.setNotifications('error', $commentHeader, response.errors);
                }
            }.bind(this),   
        });
    },
});

Comments.Comment = Comments.Base.extend({
    init: function(instance, $element) {
        this.instance = instance;
        this.$element = $element;
        this.commentId = $element.getAttribute('data-id');
        this.siteId = $element.getAttribute('data-site-id');

        this.$replyContainer = this.find($element, '[data-role="wrap-content"] > [data-role="reply"]');
        this.$repliesContainer = this.find($element, '[data-role="wrap-content"] > [data-role="replies"]');

        // Make sure we restrict event-binding to the immediate container of this comment
        // Otherwise, we risk binding events multiple times on reply comments, nested within this comment
        var $contentContainer = this.find($element, '[data-role="wrap-content"] > [data-role="content"]');

        // Actions
        this.$replyBtn = $contentContainer.querySelector('[data-action="reply"]');

        this.$editBtn = $contentContainer.querySelector('[data-action="edit"]');
        this.$deleteForm = $contentContainer.querySelector('[data-action="delete"]');
        this.$flagForm = $contentContainer.querySelector('[data-action="flag"]');
        
        this.$upvoteForm = $contentContainer.querySelector('[data-action="upvote"]');
        this.$downvoteForm = $contentContainer.querySelector('[data-action="downvote"]');

        this.$subscribeBtn = $contentContainer.querySelector('[data-action="subscribe"]');

        // Additional classes
        this.replyForm = new Comments.ReplyForm(this);
        this.editForm = new Comments.EditForm(this);

        // Add event listeners
        this.addListener(this.$replyBtn, 'click', this.reply);
        
        this.addListener(this.$editBtn, 'click', this.edit);
        this.addListener(this.$deleteForm, 'submit', this.delete);
        this.addListener(this.$flagForm, 'submit', this.flag);

        this.addListener(this.$upvoteForm, 'submit', this.upvote);
        this.addListener(this.$downvoteForm, 'submit', this.downvote);

        this.addListener(this.$subscribeBtn, 'click', this.subscribe);
    },

    reply: function(e) {
        e.preventDefault();

        if (this.replyForm.isOpen) {
            this.$replyBtn.innerHTML = this.t('reply');
            this.replyForm.closeForm();
        } else {
            this.$replyBtn.innerHTML = this.t('close');
            this.replyForm.openForm();
        }
    },

    edit: function(e) {
        e.preventDefault();

        if (this.editForm.isOpen) {
            this.$editBtn.innerHTML = this.t('edit');
            this.editForm.closeForm();
        } else {
            this.$editBtn.innerHTML = this.t('close');
            this.editForm.openForm();
        }
    },

    delete: function(e) {
        e.preventDefault();

        this.clearNotifications(this.$element);

        var data = this.serialize(e.target);

        var trashAction = 'remove';

        if (this.instance.settings.trashAction) {
            trashAction = this.instance.settings.trashAction;
        }

        var $message = this.find(this.$element, '[data-role="wrap-content"] > [data-role="content"] > [data-role="body"] > [data-role="message"]');

        if (confirm(this.t('delete-confirm')) == true) {
            this.ajax(Comments.baseUrl + 'trash', {
                method: 'POST',
                contentType: 'formData',
                data: data,
                success: function(xhr) {
                    if (trashAction === 'remove') {
                        this.$element.parentNode.removeChild(this.$element);
                    } else if (trashAction === 'message' && $message) {
                        $message.innerHTML = this.instance.settings.trashActionMessage;
                    } else if (trashAction === 'refresh') {
                        location.reload();
                    }
                }.bind(this),
                error: function(errors) {
                    this.setNotifications('error', this.$element, errors);
                }.bind(this),
            });
        }
    },

    flag: function(e) {
        e.preventDefault();

        var data = this.serialize(e.target);

        this.clearNotifications(this.$element);

        this.ajax(Comments.baseUrl + 'flag', {
            method: 'POST',
            contentType: 'formData',
            data: data,
            success: function(xhr) {
                this.toggleClass(this.$flagForm.parentNode, 'has-flag');

                if (xhr.notice) {
                    console.log(xhr.notice)
                    this.setNotifications('notice', this.$element, xhr.notice);
                }
            }.bind(this),
            error: function(errors) {
                this.setNotifications('error', this.$element, errors);
            }.bind(this)
        });
    },

    upvote: function(e) {
        e.preventDefault();

        var data = this.serialize(e.target);

        this.ajax(Comments.baseUrl + 'vote', {
            method: 'POST',
            contentType: 'formData',
            data: data,
            success: function(xhr) {
                this.vote(true);
            }.bind(this),
            error: function(errors) {
                this.setNotifications('error', this.$element, errors);
            }.bind(this),
        });
    },

    downvote: function(e) {
        e.preventDefault();

        var data = this.serialize(e.target);

        this.ajax(Comments.baseUrl + 'vote', {
            method: 'POST',
            contentType: 'formData',
            data: data,
            success: function(xhr) {
                this.vote(false);
            }.bind(this),
            error: function(errors) {
                this.setNotifications('error', this.$element, errors);
            }.bind(this),
        });
    },

    vote: function(up) {
        var $like = this.$element.querySelector('[data-role="likes"]');
        var count = parseInt($like.textContent, 10);
        
        if (!count) {
            count = 0;
        }

        if (up) {
            count++;
        } else {
            count--;
        }

        if (count === 0) {
            count = '';
        }
        
        $like.textContent = count;
    },

    subscribe: function(e) {
        e.preventDefault();

        var ownerId = this.instance.settings.element.id;
        var siteId = this.siteId;
        var commentId = this.commentId;

        this.toggleClass(this.$subscribeBtn, 'is-subscribed');

        this.ajax(Comments.baseUrl + 'subscribe', {
            method: 'POST',
            data: this.serializeObject({ ownerId: ownerId, siteId: siteId, commentId: commentId }),
            success: function(xhr) {
                if (!xhr.success) {
                    throw new Error(xhr);
                }
            }.bind(this),
            error: function(response) {
                if (response.errors) {
                }
            }.bind(this),   
        });
    },
});


Comments.ReplyForm = Comments.Base.extend({
    isOpen: false,

    init: function(comment) {
        this.comment = comment;
        this.instance = comment.instance;
        this.$element = comment.$element;
        this.$container = comment.$replyContainer;
        this.$repliesContainer = comment.$repliesContainer;
    },

    setFormHtml: function(comment) {
        var form = this.instance.$baseForm.cloneNode(true);

        // Clear errors and info
        this.clearNotifications(form);

        // Clear all inputs
        form.querySelector('form').reset();
		
		// make a new ID if we already have an ID
		if (form.getAttribute('id') !== null) {
            form.setAttribute('id', this.makeUniqueID(form.getAttribute('id')));
        }

        // Set the value to be the id of comment we're replying to
        (form.querySelector('input[name="newParentId"]') || {}).value = this.comment.commentId;

        this.$container.innerHTML = form.outerHTML;
    },

    openForm: function(comment) {
        this.setFormHtml(comment);

        this.isOpen = true;

        this.$form = this.$container.querySelector('[role="form"]');

        if (this.$form) {
            this.addListener(this.$form, 'submit', this.onSubmit, false);
        }
    },

    closeForm: function() {
        this.$container.innerHTML = '';

        this.isOpen = false;
    },

    onSubmit: function(e) {
        e.preventDefault();

        this.postForm(e, 'save', function(xhr) {
            if (xhr.html) {
                var $newComment = this.createElement(xhr.html);

                // Remove the form (empty the container)
                this.remove(this.$container.firstChild);

                // Prepend it to the original comment
                this.$repliesContainer.insertBefore($newComment, this.$repliesContainer.firstChild);

                this.instance.comments[xhr.id] = new Comments.Comment(this.instance, $newComment);

                this.comment.$replyBtn.innerHTML = this.t('reply')

                this.isOpen = false;
            }

            // If a comment was successfully submitted but under review
            if (xhr.success) {
                this.$form.reset();
            }
        }.bind(this));
    },
});


Comments.EditForm = Comments.Base.extend({
    isOpen: false,

    init: function(comment) {
        this.comment = comment;
        this.instance = comment.instance;
        this.$element = comment.$element;
        this.$container = comment.$replyContainer;

        this.$comment = this.$element.querySelector('[data-role="message"]');
        this.commentText = this.$comment.innerHTML.replace(/<[^>]+>/g, '').trim();
    },

    setFormHtml: function() {
        var form = this.instance.$baseForm.cloneNode(true);

        // Clear errors and info
        this.clearNotifications(form);

        // Remove some stuff
        this.remove(form.querySelector('[name="fields[name]"]'));
        this.remove(form.querySelector('[name="fields[email]"]'));
        this.remove(form.querySelector('.cc-i-figure'));
		
		// make a new ID if we already have an ID
		if (form.getAttribute('id') !== null) {
            form.setAttribute('id', this.makeUniqueID(form.getAttribute('id')));
        }

        // Clear and update
        form.querySelector('[name="fields[comment]"]').innerHTML = this.commentText;
        form.querySelector('[type="submit"]').innerHTML = this.t('save');

        // Set the value to be the id of comment we're replying to
        (form.querySelector('input[name="commentId"]') || {}).value = this.comment.commentId;

        this.$comment.innerHTML = form.outerHTML;
    },

    openForm: function() {
        this.setFormHtml();

        this.isOpen = true;

        this.addListener(this.$comment.querySelector('[role="form"]'), 'submit', this.onSubmit, false);
    },

    closeForm: function() {
        var $comment = this.$element.querySelector('[data-role="message"]');
        
        $comment.innerHTML = '<p>' + this.commentText.replace(/\n/g, '<br>') + '</p>';

        this.isOpen = false;
    },

    onSubmit: function(e) {
        e.preventDefault();

        this.postForm(e, 'save', function(xhr) {
            var $comment = this.$element.querySelector('[data-role="message"]');
            var commentText = this.$element.querySelector('[name="fields[comment]"]').value;
            
            $comment.innerHTML = '<p>' + commentText.replace(/\n/g, '<br>\n') + '</p>';

            this.comment.editForm = new Comments.EditForm(this.comment);

            this.comment.$editBtn.innerHTML = this.t('edit');

            this.isOpen = false;
        }.bind(this));
    },
});

