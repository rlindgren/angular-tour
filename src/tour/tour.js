'use strict';
angular.module('angular-tour.tour', [])

  /**
   * tourConfig
   * Default configuration, can be customized by injecting tourConfig into your app and modifying it
   */
  .constant('tourConfig', {
    placement        : 'top',                  // default placement relative to target. 'top', 'right', 'left', 'bottom'
    animation        : true,                   // if tips fade in
    nextLabel        : 'NEXT',                 // default text in the next tip button
    scrollSpeed      : 500,                    // page scrolling speed in milliseconds
    offset           : 28,                     // how many pixels offset the tip is from the target
    frame            : 'html,body'             // base scrolling element
  })

  /**
   * TourController
   * the logic for the tour, which manages all the steps
   */
  .controller('TourController', function($scope, orderedList) {
    var self = this;
    self.postTourCallback = angular.noop;
    self.postStepCallback = angular.noop;
    self.currentStep = 0;
    self.steps = orderedList();

    self.select = function (nextIndex) {
      if (!angular.isNumber(nextIndex))
        return;
      self.unselectAllSteps();
      var step = self.steps.get(nextIndex);
      if (step) {
        step.ttOpen = true;
      }
      if (self.currentStep !== nextIndex) {
        self.currentStep = nextIndex;
      }
      if (nextIndex >= self.steps.getCount()) {
        self.postTourCallback();
      }
      self.postStepCallback();
    };

    self.addStep = function (step) {
      if (angular.isNumber(step.index) && !isNaN(step.index)) {
        self.steps.set(step.index, step);
      } else {
        self.steps.push(step);
      }
    };

    self.unselectAllSteps = function () {
      self.steps.forEach(function (step) {
        step.ttOpen = false;
      });
    };

    self.cancelTour = function () {
      self.unselectAllSteps();
      self.postTourCallback();
    };

    $scope.openTour = function () {
      self.select(0);  // always start from 0
    };

    $scope.closeTour = function () {
      self.cancelTour();
    };
  })

  /**
   * Tour
   * directive that allows you to control the tour
   */
  .directive('tour', function ($parse, $rootScope) {
    return {
      controller: 'TourController',
      restrict: 'EA',
      scope: true,
      link: function (scope, element, attrs, ctrl) {
        if (!angular.isDefined(attrs.step)) {
          throw 'The <tour> directive requires a `step` attribute to bind the current step to.';
        }
        var model = $parse(attrs.step);
        scope.$watch(attrs.step, function (newVal) {
          ctrl.currentStep = newVal;
        });
        ctrl.postTourCallback = function () {
          if (angular.isDefined(attrs.postTour)) {
            scope.$parent.$eval(attrs.postTour);
          }
        };
        ctrl.postStepCallback = function () {
          if (angular.isDefined(attrs.postStep)) {
            scope.$parent.$eval(attrs.postStep);
          }
        };
        scope.setCurrentStep = function (val) {
          $rootScope.$broadcast('$tour:nextStep'+(val-1));
          model.assign(scope.$parent, val);
          ctrl.currentStep = val;
          ctrl.select(ctrl.currentStep);
        };
        scope.getCurrentStep = function () {
          return ctrl.currentStep;
        };
      }
    };
  })

  /**
   * Tourtip
   * tourtip manages the state of the tour-popup directive
   */
  .directive('tourtip', function ($window, $compile, $interpolate, $parse, $timeout, $sce, scrollTo, tourConfig) {
    var startSym = $interpolate.startSymbol(),
        endSym = $interpolate.endSymbol();

    var template = '<div tour-popup></div>';

    return {
      require: '^tour',
      restrict: 'EA',
      compile: function (EL, ATTRS) {
        var _global = angular.element($window);
        return {
          pre: function (scope, element, attrs, tourCtrl) {
            attrs.$observe('tourtip', function (val) {
              scope.ttContent = $sce.trustAsHtml(val);
            });
            attrs.$observe('tourtipPlacement', function (val) {
              scope.ttPlacement = val || tourConfig.placement;
            });
            attrs.$observe('tourtipNextLabel', function (val) {
              scope.ttNextLabel = $sce.trustAsHtml(val || tourConfig.nextLabel);
            });
            attrs.$observe('tourtipOffsetTop', function (val) {
              scope.ttOffsetTop = parseInt(val, 10) || 0;
            });
            attrs.$observe('tourtipOffsetLeft', function (val) {
              scope.ttOffsetLeft = parseInt(val, 10) || 0;
            });
            attrs.$observe('tourtipFrame', function (val) {
              scope.ttFrame = val || tourConfig.frame;
            });
            attrs.$observe('postStep', function (val) {
              scope.ttPostStep = val ? $parse(val) : angular.noop;
            });
            attrs.$observe('tourtipAlign', function (val) {
              scope.ttAlign = 'top bottom'.match(scope.ttPlacement) ? val || 'left' : val || 'top';
            });
            scope.ttOpen = false;
            scope.ttAnimation = tourConfig.animation;
            scope.index = parseInt(attrs.tourtipStep, 10);
            tourCtrl.addStep(scope);
          },
          post: function (scope, element, attrs, tourCtrl) {
            var tourtip = $compile(template)(scope);
            var targetElement, frame;
            var scrollHandler = function (e) {
              updatePosition(targetElement, tourtip);
            };
            if (element.children().eq(0).length > 0)
              targetElement = element.children().eq(0);
            else
              targetElement = element;
            frame = targetElement.closest(scope.ttFrame);
            $timeout(function () {
              scope.$watch('ttOpen', function (val) {
                if (val) {
                  show();
                } else {
                  hide();
                }
              });
            }, 500);
            var updatePosition = function (targetElement, tourtip) {
              var rects, ttWidth, ttHeight, ttPosition, height, width, arrowOffset;
              rects = targetElement[0].getBoundingClientRect();
              ttWidth = tourtip.width();
              ttHeight = tourtip.height();
              width = targetElement.width();
              height = targetElement.height();
              arrowOffset = $('.tour-arrow')[0].getBoundingClientRect().height;
              switch (scope.ttPlacement) {
              case 'right':
              case 'left':
                if (scope.ttAlign == 'top') {
                  ttPosition = { top: rects.top - (ttHeight > height ? height/2 + arrowOffset : 0) + scope.ttOffsetTop };
                } else {
                  ttPosition = { top: rects.top - (ttHeight > height ? ttHeight - (height / 2) - arrowOffset : ttHeight) + scope.ttOffsetTop };
                }
                ttPosition.left = scope.ttPlacement == 'right' ? rects.left + width + scope.ttOffsetLeft : rects.left - ttWidth - scope.ttOffsetLeft;
                break;
              case 'bottom':
              case 'top':
                if (scope.ttAlign == 'left') {
                  ttPosition = { left: rects.left - (ttWidth > width ? arrowOffset : 0) + scope.ttOffsetLeft};
                } else {
                  ttPosition = { left: rects.left - (ttWidth > width ? ttWidth + (arrowOffset * 2) : ttWidth) + scope.ttOffsetLeft};
                }
                ttPosition.top = scope.ttPlacement == 'bottom' ? rects.top + height + scope.ttOffsetTop : rects.top - ttHeight - scope.ttOffsetTop;
                break;
              }
              ttPosition.top += 'px';
              ttPosition.left += 'px';
              tourtip.css(ttPosition);
            };
            function show() {
              if (!scope.ttContent) return;
              if (scope.ttAnimation) {
                tourtip.fadeIn();
              } else {
                tourtip.css({ display: 'block' });
              }
              frame = targetElement.closest(scope.ttFrame);
              $('body').append(tourtip);
              _global.bind('resize.' + scope.$id, scrollHandler);
              frame.bind('scroll', scrollHandler);
              updatePosition(targetElement, tourtip);
              var scrollConfig = {
                duration: tourConfig.speed,
                easing: 'swing'
              };
              if (scope.ttPlacement == 'top' || scope.ttAlign == 'bottom') {
                scrollConfig.offsetTop = tourtip.height() + (frame.offset().top ? frame.offset().top + 100 : 100);  // take tourtip height and the top offset of the frame into account
              } else {
                scrollConfig.offsetTop = frame.offset().top ? frame.offset().top + 100 : 100;
              }
              scrollTo(frame, targetElement, scrollConfig);
            }
            function hide() {
              frame = targetElement.closest(scope.ttFrame);
              tourtip.detach();
              _global.unbind('resize.' + scope.$id, scrollHandler);
              frame.unbind('scroll', scrollHandler);
            }
            scope.$on('$destroy', function onDestroyTourtip() {
              _global.unbind('resize.' + scope.$id, scrollHandler);
              frame.unbind('scroll', scrollHandler);
              tourtip.remove();
            });
            scope.$on('$tour:nextStep' + attrs.tourtipStep, function () {
              if (scope.ttPostStep(scope.$parent))
                scope.ttPostStep(scope.$parent)();
            });
          }
        };
      }
    };
  })

  /**
   * TourPopup
   * the directive that actually has the template for the tip
   */
  .directive('tourPopup', function () {
    return {
      replace: true,
      templateUrl: 'tour/tour.tpl.html',
      scope: true,
      restrict: 'EA',
      link: function (scope, element, attrs) {
      }
    };
  })

  /**
   * OrderedList
   * Used for keeping steps in order
   */
  .factory('orderedList', function () {
    var OrderedList = function() {
      this.map = {};
      this._array = [];
    };
    
    OrderedList.prototype.set = function (key, value) {
      if (!angular.isNumber(key))
        return;
      if (key in this.map) {
        this.map[key] = value;
      } else {
        if (key < this._array.length) {
          var insertIndex = key - 1 > 0 ? key - 1 : 0;
          this._array.splice(insertIndex, 0, key);
        } else {
          this._array.push(key);
        }
        this.map[key] = value;
        this._array.sort(function(a,b){
          return a-b;
        });
      }
    };
    OrderedList.prototype.indexOf = function (value) {
      for (var prop in this.map) {
        if (this.map.hasOwnProperty(prop)) {
          if (this.map[prop] === value)
            return Number(prop);
        }
      }
    };
    OrderedList.prototype.push = function (value) {
      var key = this._array[this._array.length - 1] + 1 || 0;
      this._array.push(key);
      this.map[key] = value;
      this._array.sort(function(a, b) {
        return a-b;
      });
    };
    OrderedList.prototype.remove = function (key) {
      var index = this._array.indexOf(key);
      if (index === -1) {
        throw new Error('key does not exist');
      }
      this._array.splice(index, 1);
      delete this.map[key];
    };
    OrderedList.prototype.get = function (key) {
      return this.map[key];
    };
    OrderedList.prototype.getCount = function () {
      return this._array.length;
    };
    OrderedList.prototype.forEach = function (f) {
      var key, value;
      for (var i = 0; i < this._array.length; i++) {
        key = this._array[i];
        value = this.map[key];
        f(value, key);
      }
    };
    OrderedList.prototype.first = function () {
      var key, value;
      key = this._array[0];
      value = this.map[key];
      return value;
    };

    var orderedListFactory = function() {
      return new OrderedList();
    };
    
    return orderedListFactory;
  })

  /**
   * ScrollTo
   * Smoothly scroll to a dom element
   */
  .factory('scrollTo', function() {
    // code adapted from: http://lions-mark.com/jquery/scrollTo/
    return function( frame, target, options, callback ){
      frame = $(frame);
      if (typeof options === 'function' && arguments.length === 2) {
        callback = options;
        options = target;
      }
      var settings = $.extend({
        scrollTarget  : target,
        offsetTop     : 50,
        duration      : 500,
        easing        : 'swing'
      }, options);
      var scrollTarget = (typeof settings.scrollTarget === 'number') ? settings.scrollTarget : $(settings.scrollTarget);
      var scrollY = (typeof scrollTarget === 'number') ? scrollTarget : scrollTarget.offset().top + frame.scrollTop() - parseInt(settings.offsetTop, 10);
      frame.animate({scrollTop : scrollY }, parseInt(settings.duration, 10), settings.easing, function(){
        if (typeof callback === 'function') { callback.call(this); }
      });
    };
  });